-- stock-opname, the reporting views.
-- Prisma does not manage views, so this migration is hand written on purpose.
-- Every line here is specified in 03-data-model.md section 8. Do not improvise.

-- 1. Current value per key = the most recent row. There is no "current" column.
CREATE VIEW v_current_counts AS
SELECT DISTINCT ON (tag_id, pass, snapshot_item_id, kondisi)
       session_id, tag_id, pass, snapshot_item_id, kondisi, qty, qty_note, counted_by, device_id
FROM   counts
ORDER  BY tag_id, pass, snapshot_item_id, kondisi, client_created_at DESC;

-- 2. Quantity per tag, per item, per pass. Kondisi is summed away here on purpose:
--    8 baik + 2 rusak against 10 baik is agreement on quantity and a difference of
--    opinion about damage. Block on objective disagreements, report subjective ones.
CREATE VIEW v_tag_item_pass AS
SELECT session_id, tag_id, snapshot_item_id, pass, SUM(qty) AS qty
FROM   v_current_counts
GROUP  BY session_id, tag_id, snapshot_item_id, pass;

-- 3. The three passes side by side.
CREATE VIEW v_tag_item AS
SELECT session_id, tag_id, snapshot_item_id,
       MAX(qty) FILTER (WHERE pass = 1) AS qty_1,
       MAX(qty) FILTER (WHERE pass = 2) AS qty_2,
       MAX(qty) FILTER (WHERE pass = 3) AS qty_3
FROM   v_tag_item_pass
GROUP  BY session_id, tag_id, snapshot_item_id;

-- 4. SELISIH HITUNG: the two counters disagree. Must reach zero before any
--    variance is reported.
--
--    COALESCE is doing real work. If counter A found an item and counter B
--    recorded nothing, qty_2 is NULL and NULL <> 5 evaluates to NULL, so the row
--    would silently vanish. That case is the one most worth catching.
--    NEVER write this as qty_1 <> qty_2.
CREATE VIEW v_selisih_hitung AS
SELECT session_id, tag_id, snapshot_item_id, qty_1, qty_2
FROM   v_tag_item
WHERE  qty_3 IS NULL
  AND  COALESCE(qty_1, 0) <> COALESCE(qty_2, 0);

-- 5. The agreed quantity. A third count always wins. Otherwise the two passes
--    must agree, and if they do not, qty_agreed is NULL and the session cannot
--    reach review.
CREATE VIEW v_agreed AS
SELECT session_id, tag_id, snapshot_item_id,
       COALESCE(qty_3,
                CASE WHEN COALESCE(qty_1,0) = COALESCE(qty_2,0)
                     THEN COALESCE(qty_1,0) END) AS qty_agreed
FROM   v_tag_item;

-- 6. SELISIH SISTEM: the real finding.
--
--    The LEFT JOIN is the most important word in this file. An INNER JOIN is the
--    natural thing to write and it silently drops every item no counter recorded,
--    which is the largest finding a stock opname can produce. The report still
--    looks complete.
CREATE VIEW v_selisih_sistem AS
SELECT si.session_id,
       si.id                                             AS snapshot_item_id,
       si.gudang_id,
       si.kode_barang,
       si.barcode_4,
       si.nama_barang,
       si.qty_onhand,
       COALESCE(SUM(a.qty_agreed), 0)                    AS qty_hitung,
       COALESCE(SUM(a.qty_agreed), 0) - si.qty_onhand    AS selisih_qty,
       (COALESCE(SUM(a.qty_agreed), 0) - si.qty_onhand)
         * COALESCE(si.harga_satuan, 0)                  AS selisih_nilai,
       -- An item counted on some tag where the two passes disagree. The
       -- `a.tag_id IS NOT NULL` guard matters: with a LEFT JOIN, an item nobody
       -- counted anywhere also produces a NULL qty_agreed, and without the guard
       -- it would be reported as a counting dispute rather than as a zero found.
       bool_or(a.tag_id IS NOT NULL AND a.qty_agreed IS NULL) AS ada_selisih_hitung
FROM   snapshot_items si
LEFT   JOIN v_agreed a ON a.snapshot_item_id = si.id
GROUP  BY si.id;

-- 7. Tag status, derived and never stored. A status column would be a second
--    copy of the truth, and the day one insert path forgets to update it the
--    denah shows green for a tag nobody counted.
CREATE VIEW v_tag_status AS
SELECT st.session_id,
       st.tag_id,
       st.nomor,
       st.lokasi_nama,
       st.gudang_nama,
       st.weight,
       st.urutan,
       CASE
         WHEN s1.is_empty AND s2.is_empty                       THEN 'kosong'
         WHEN s1.tag_id IS NULL                                 THEN 'belum'
         WHEN s2.tag_id IS NULL                                 THEN 'menunggu_hitung_2'
         WHEN EXISTS (SELECT 1 FROM v_selisih_hitung sh
                      WHERE sh.session_id = st.session_id
                        AND sh.tag_id     = st.tag_id)          THEN 'selisih_hitung'
         ELSE 'selesai'
       END AS status
FROM   session_tags st
LEFT   JOIN LATERAL (
         SELECT ts.tag_id, ts.is_empty FROM tag_submissions ts
         WHERE ts.session_id = st.session_id AND ts.tag_id = st.tag_id AND ts.pass = 1
         ORDER BY ts.client_created_at DESC LIMIT 1
       ) s1 ON true
LEFT   JOIN LATERAL (
         SELECT ts.tag_id, ts.is_empty FROM tag_submissions ts
         WHERE ts.session_id = st.session_id AND ts.tag_id = st.tag_id AND ts.pass = 2
         ORDER BY ts.client_created_at DESC LIMIT 1
       ) s2 ON true;
