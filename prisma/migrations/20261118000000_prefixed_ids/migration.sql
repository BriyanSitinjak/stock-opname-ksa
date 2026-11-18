-- Entity ids become prefix-number text: usr-1, ses-1, tag-11.
-- client_row_id stays uuid. The phone generates it before any network call.

DROP VIEW IF EXISTS v_tag_status;
DROP VIEW IF EXISTS v_selisih_sistem;
DROP VIEW IF EXISTS v_agreed;
DROP VIEW IF EXISTS v_selisih_hitung;
DROP VIEW IF EXISTS v_tag_item;
DROP VIEW IF EXISTS v_tag_item_pass;
DROP VIEW IF EXISTS v_current_counts;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, c.conname
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public' AND c.contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE users ALTER COLUMN id DROP IDENTITY;
ALTER TABLE gudang ALTER COLUMN id DROP IDENTITY;
ALTER TABLE lokasi ALTER COLUMN id DROP IDENTITY;
ALTER TABLE tags ALTER COLUMN id DROP IDENTITY;
ALTER TABLE opname_sessions ALTER COLUMN id DROP IDENTITY;
ALTER TABLE import_rows ALTER COLUMN id DROP IDENTITY;
ALTER TABLE snapshot_items ALTER COLUMN id DROP IDENTITY;
ALTER TABLE tag_assignments ALTER COLUMN id DROP IDENTITY;
ALTER TABLE counts ALTER COLUMN id DROP IDENTITY;
ALTER TABLE tag_submissions ALTER COLUMN id DROP IDENTITY;
ALTER TABLE unknown_items ALTER COLUMN id DROP IDENTITY;
ALTER TABLE approvals ALTER COLUMN id DROP IDENTITY;
ALTER TABLE session_reopens ALTER COLUMN id DROP IDENTITY;

ALTER TABLE users ALTER COLUMN id TYPE text USING 'usr-' || id::text;
ALTER TABLE gudang ALTER COLUMN id TYPE text USING 'gdg-' || id::text;
ALTER TABLE lokasi ALTER COLUMN id TYPE text USING 'lok-' || id::text;
ALTER TABLE lokasi ALTER COLUMN gudang_id TYPE text USING 'gdg-' || gudang_id::text;
ALTER TABLE tags ALTER COLUMN id TYPE text USING 'tag-' || id::text;
ALTER TABLE tags ALTER COLUMN lokasi_id TYPE text USING 'lok-' || lokasi_id::text;
ALTER TABLE opname_sessions ALTER COLUMN id TYPE text USING 'ses-' || id::text;
ALTER TABLE opname_sessions ALTER COLUMN created_by TYPE text USING CASE WHEN created_by IS NULL THEN NULL ELSE 'usr-' || created_by::text END;
ALTER TABLE session_tags ALTER COLUMN session_id TYPE text USING 'ses-' || session_id::text;
ALTER TABLE session_tags ALTER COLUMN tag_id TYPE text USING 'tag-' || tag_id::text;
ALTER TABLE import_rows ALTER COLUMN id TYPE text USING 'imp-' || id::text;
ALTER TABLE import_rows ALTER COLUMN session_id TYPE text USING 'ses-' || session_id::text;
ALTER TABLE snapshot_items ALTER COLUMN id TYPE text USING 'itm-' || id::text;
ALTER TABLE snapshot_items ALTER COLUMN session_id TYPE text USING 'ses-' || session_id::text;
ALTER TABLE snapshot_items ALTER COLUMN gudang_id TYPE text USING 'gdg-' || gudang_id::text;
ALTER TABLE tag_assignments ALTER COLUMN id TYPE text USING 'asg-' || id::text;
ALTER TABLE tag_assignments ALTER COLUMN session_id TYPE text USING 'ses-' || session_id::text;
ALTER TABLE tag_assignments ALTER COLUMN tag_id TYPE text USING 'tag-' || tag_id::text;
ALTER TABLE tag_assignments ALTER COLUMN user_id TYPE text USING 'usr-' || user_id::text;
ALTER TABLE counts ALTER COLUMN id TYPE text USING 'cnt-' || id::text;
ALTER TABLE counts ALTER COLUMN session_id TYPE text USING 'ses-' || session_id::text;
ALTER TABLE counts ALTER COLUMN tag_id TYPE text USING 'tag-' || tag_id::text;
ALTER TABLE counts ALTER COLUMN snapshot_item_id TYPE text USING 'itm-' || snapshot_item_id::text;
ALTER TABLE counts ALTER COLUMN counted_by TYPE text USING 'usr-' || counted_by::text;
ALTER TABLE tag_submissions ALTER COLUMN id TYPE text USING 'sub-' || id::text;
ALTER TABLE tag_submissions ALTER COLUMN session_id TYPE text USING 'ses-' || session_id::text;
ALTER TABLE tag_submissions ALTER COLUMN tag_id TYPE text USING 'tag-' || tag_id::text;
ALTER TABLE tag_submissions ALTER COLUMN submitted_by TYPE text USING 'usr-' || submitted_by::text;
ALTER TABLE unknown_items ALTER COLUMN id TYPE text USING 'unk-' || id::text;
ALTER TABLE unknown_items ALTER COLUMN session_id TYPE text USING 'ses-' || session_id::text;
ALTER TABLE unknown_items ALTER COLUMN tag_id TYPE text USING 'tag-' || tag_id::text;
ALTER TABLE unknown_items ALTER COLUMN counted_by TYPE text USING 'usr-' || counted_by::text;
ALTER TABLE user_devices ALTER COLUMN session_id TYPE text USING 'ses-' || session_id::text;
ALTER TABLE user_devices ALTER COLUMN user_id TYPE text USING 'usr-' || user_id::text;
ALTER TABLE user_devices ALTER COLUMN bound_by TYPE text USING CASE WHEN bound_by IS NULL THEN NULL ELSE 'usr-' || bound_by::text END;
ALTER TABLE approvals ALTER COLUMN id TYPE text USING 'apv-' || id::text;
ALTER TABLE approvals ALTER COLUMN session_id TYPE text USING 'ses-' || session_id::text;
ALTER TABLE approvals ALTER COLUMN approved_by TYPE text USING 'usr-' || approved_by::text;
ALTER TABLE session_reopens ALTER COLUMN id TYPE text USING 'rop-' || id::text;
ALTER TABLE session_reopens ALTER COLUMN session_id TYPE text USING 'ses-' || session_id::text;
ALTER TABLE session_reopens ALTER COLUMN reopened_by TYPE text USING 'usr-' || reopened_by::text;

ALTER TABLE users ADD CONSTRAINT users_id_prefix CHECK (id ~ '^usr-[1-9][0-9]*$');
ALTER TABLE gudang ADD CONSTRAINT gudang_id_prefix CHECK (id ~ '^gdg-[1-9][0-9]*$');
ALTER TABLE lokasi ADD CONSTRAINT lokasi_id_prefix CHECK (id ~ '^lok-[1-9][0-9]*$');
ALTER TABLE lokasi ADD CONSTRAINT lokasi_gudang_id_prefix CHECK (gudang_id ~ '^gdg-[1-9][0-9]*$');
ALTER TABLE tags ADD CONSTRAINT tags_id_prefix CHECK (id ~ '^tag-[1-9][0-9]*$');
ALTER TABLE tags ADD CONSTRAINT tags_lokasi_id_prefix CHECK (lokasi_id ~ '^lok-[1-9][0-9]*$');
ALTER TABLE opname_sessions ADD CONSTRAINT opname_sessions_id_prefix CHECK (id ~ '^ses-[1-9][0-9]*$');
ALTER TABLE opname_sessions ADD CONSTRAINT opname_sessions_created_by_prefix CHECK (created_by IS NULL OR created_by ~ '^usr-[1-9][0-9]*$');
ALTER TABLE session_tags ADD CONSTRAINT session_tags_session_id_prefix CHECK (session_id ~ '^ses-[1-9][0-9]*$');
ALTER TABLE session_tags ADD CONSTRAINT session_tags_tag_id_prefix CHECK (tag_id ~ '^tag-[1-9][0-9]*$');
ALTER TABLE import_rows ADD CONSTRAINT import_rows_id_prefix CHECK (id ~ '^imp-[1-9][0-9]*$');
ALTER TABLE import_rows ADD CONSTRAINT import_rows_session_id_prefix CHECK (session_id ~ '^ses-[1-9][0-9]*$');
ALTER TABLE snapshot_items ADD CONSTRAINT snapshot_items_id_prefix CHECK (id ~ '^itm-[1-9][0-9]*$');
ALTER TABLE snapshot_items ADD CONSTRAINT snapshot_items_session_id_prefix CHECK (session_id ~ '^ses-[1-9][0-9]*$');
ALTER TABLE snapshot_items ADD CONSTRAINT snapshot_items_gudang_id_prefix CHECK (gudang_id ~ '^gdg-[1-9][0-9]*$');
ALTER TABLE tag_assignments ADD CONSTRAINT tag_assignments_id_prefix CHECK (id ~ '^asg-[1-9][0-9]*$');
ALTER TABLE tag_assignments ADD CONSTRAINT tag_assignments_session_id_prefix CHECK (session_id ~ '^ses-[1-9][0-9]*$');
ALTER TABLE tag_assignments ADD CONSTRAINT tag_assignments_tag_id_prefix CHECK (tag_id ~ '^tag-[1-9][0-9]*$');
ALTER TABLE tag_assignments ADD CONSTRAINT tag_assignments_user_id_prefix CHECK (user_id ~ '^usr-[1-9][0-9]*$');
ALTER TABLE counts ADD CONSTRAINT counts_id_prefix CHECK (id ~ '^cnt-[1-9][0-9]*$');
ALTER TABLE counts ADD CONSTRAINT counts_session_id_prefix CHECK (session_id ~ '^ses-[1-9][0-9]*$');
ALTER TABLE counts ADD CONSTRAINT counts_tag_id_prefix CHECK (tag_id ~ '^tag-[1-9][0-9]*$');
ALTER TABLE counts ADD CONSTRAINT counts_snapshot_item_id_prefix CHECK (snapshot_item_id ~ '^itm-[1-9][0-9]*$');
ALTER TABLE counts ADD CONSTRAINT counts_counted_by_prefix CHECK (counted_by ~ '^usr-[1-9][0-9]*$');
ALTER TABLE tag_submissions ADD CONSTRAINT tag_submissions_id_prefix CHECK (id ~ '^sub-[1-9][0-9]*$');
ALTER TABLE tag_submissions ADD CONSTRAINT tag_submissions_session_id_prefix CHECK (session_id ~ '^ses-[1-9][0-9]*$');
ALTER TABLE tag_submissions ADD CONSTRAINT tag_submissions_tag_id_prefix CHECK (tag_id ~ '^tag-[1-9][0-9]*$');
ALTER TABLE tag_submissions ADD CONSTRAINT tag_submissions_submitted_by_prefix CHECK (submitted_by ~ '^usr-[1-9][0-9]*$');
ALTER TABLE unknown_items ADD CONSTRAINT unknown_items_id_prefix CHECK (id ~ '^unk-[1-9][0-9]*$');
ALTER TABLE unknown_items ADD CONSTRAINT unknown_items_session_id_prefix CHECK (session_id ~ '^ses-[1-9][0-9]*$');
ALTER TABLE unknown_items ADD CONSTRAINT unknown_items_tag_id_prefix CHECK (tag_id ~ '^tag-[1-9][0-9]*$');
ALTER TABLE unknown_items ADD CONSTRAINT unknown_items_counted_by_prefix CHECK (counted_by ~ '^usr-[1-9][0-9]*$');
ALTER TABLE user_devices ADD CONSTRAINT user_devices_session_id_prefix CHECK (session_id ~ '^ses-[1-9][0-9]*$');
ALTER TABLE user_devices ADD CONSTRAINT user_devices_user_id_prefix CHECK (user_id ~ '^usr-[1-9][0-9]*$');
ALTER TABLE user_devices ADD CONSTRAINT user_devices_bound_by_prefix CHECK (bound_by IS NULL OR bound_by ~ '^usr-[1-9][0-9]*$');
ALTER TABLE approvals ADD CONSTRAINT approvals_id_prefix CHECK (id ~ '^apv-[1-9][0-9]*$');
ALTER TABLE approvals ADD CONSTRAINT approvals_session_id_prefix CHECK (session_id ~ '^ses-[1-9][0-9]*$');
ALTER TABLE approvals ADD CONSTRAINT approvals_approved_by_prefix CHECK (approved_by ~ '^usr-[1-9][0-9]*$');
ALTER TABLE session_reopens ADD CONSTRAINT session_reopens_id_prefix CHECK (id ~ '^rop-[1-9][0-9]*$');
ALTER TABLE session_reopens ADD CONSTRAINT session_reopens_session_id_prefix CHECK (session_id ~ '^ses-[1-9][0-9]*$');
ALTER TABLE session_reopens ADD CONSTRAINT session_reopens_reopened_by_prefix CHECK (reopened_by ~ '^usr-[1-9][0-9]*$');

CREATE SEQUENCE users_id_seq;
CREATE SEQUENCE gudang_id_seq;
CREATE SEQUENCE lokasi_id_seq;
CREATE SEQUENCE tags_id_seq;
CREATE SEQUENCE opname_sessions_id_seq;
CREATE SEQUENCE import_rows_id_seq;
CREATE SEQUENCE snapshot_items_id_seq;
CREATE SEQUENCE tag_assignments_id_seq;
CREATE SEQUENCE counts_id_seq;
CREATE SEQUENCE tag_submissions_id_seq;
CREATE SEQUENCE unknown_items_id_seq;
CREATE SEQUENCE approvals_id_seq;
CREATE SEQUENCE session_reopens_id_seq;

ALTER TABLE users ALTER COLUMN id SET DEFAULT ('usr-' || nextval('users_id_seq'));
ALTER TABLE gudang ALTER COLUMN id SET DEFAULT ('gdg-' || nextval('gudang_id_seq'));
ALTER TABLE lokasi ALTER COLUMN id SET DEFAULT ('lok-' || nextval('lokasi_id_seq'));
ALTER TABLE tags ALTER COLUMN id SET DEFAULT ('tag-' || nextval('tags_id_seq'));
ALTER TABLE opname_sessions ALTER COLUMN id SET DEFAULT ('ses-' || nextval('opname_sessions_id_seq'));
ALTER TABLE import_rows ALTER COLUMN id SET DEFAULT ('imp-' || nextval('import_rows_id_seq'));
ALTER TABLE snapshot_items ALTER COLUMN id SET DEFAULT ('itm-' || nextval('snapshot_items_id_seq'));
ALTER TABLE tag_assignments ALTER COLUMN id SET DEFAULT ('asg-' || nextval('tag_assignments_id_seq'));
ALTER TABLE counts ALTER COLUMN id SET DEFAULT ('cnt-' || nextval('counts_id_seq'));
ALTER TABLE tag_submissions ALTER COLUMN id SET DEFAULT ('sub-' || nextval('tag_submissions_id_seq'));
ALTER TABLE unknown_items ALTER COLUMN id SET DEFAULT ('unk-' || nextval('unknown_items_id_seq'));
ALTER TABLE approvals ALTER COLUMN id SET DEFAULT ('apv-' || nextval('approvals_id_seq'));
ALTER TABLE session_reopens ALTER COLUMN id SET DEFAULT ('rop-' || nextval('session_reopens_id_seq'));

ALTER SEQUENCE users_id_seq OWNED BY users.id;
ALTER SEQUENCE gudang_id_seq OWNED BY gudang.id;
ALTER SEQUENCE lokasi_id_seq OWNED BY lokasi.id;
ALTER SEQUENCE tags_id_seq OWNED BY tags.id;
ALTER SEQUENCE opname_sessions_id_seq OWNED BY opname_sessions.id;
ALTER SEQUENCE import_rows_id_seq OWNED BY import_rows.id;
ALTER SEQUENCE snapshot_items_id_seq OWNED BY snapshot_items.id;
ALTER SEQUENCE tag_assignments_id_seq OWNED BY tag_assignments.id;
ALTER SEQUENCE counts_id_seq OWNED BY counts.id;
ALTER SEQUENCE tag_submissions_id_seq OWNED BY tag_submissions.id;
ALTER SEQUENCE unknown_items_id_seq OWNED BY unknown_items.id;
ALTER SEQUENCE approvals_id_seq OWNED BY approvals.id;
ALTER SEQUENCE session_reopens_id_seq OWNED BY session_reopens.id;

SELECT setval('users_id_seq', GREATEST((SELECT COALESCE(MAX(substring(id FROM '[0-9]+$')::int), 1) FROM users), 1), (SELECT COUNT(*) FROM users) > 0);
SELECT setval('gudang_id_seq', GREATEST((SELECT COALESCE(MAX(substring(id FROM '[0-9]+$')::int), 1) FROM gudang), 1), (SELECT COUNT(*) FROM gudang) > 0);
SELECT setval('lokasi_id_seq', GREATEST((SELECT COALESCE(MAX(substring(id FROM '[0-9]+$')::int), 1) FROM lokasi), 1), (SELECT COUNT(*) FROM lokasi) > 0);
SELECT setval('tags_id_seq', GREATEST((SELECT COALESCE(MAX(substring(id FROM '[0-9]+$')::int), 1) FROM tags), 1), (SELECT COUNT(*) FROM tags) > 0);
SELECT setval('opname_sessions_id_seq', GREATEST((SELECT COALESCE(MAX(substring(id FROM '[0-9]+$')::int), 1) FROM opname_sessions), 1), (SELECT COUNT(*) FROM opname_sessions) > 0);
SELECT setval('import_rows_id_seq', GREATEST((SELECT COALESCE(MAX(substring(id FROM '[0-9]+$')::int), 1) FROM import_rows), 1), (SELECT COUNT(*) FROM import_rows) > 0);
SELECT setval('snapshot_items_id_seq', GREATEST((SELECT COALESCE(MAX(substring(id FROM '[0-9]+$')::int), 1) FROM snapshot_items), 1), (SELECT COUNT(*) FROM snapshot_items) > 0);
SELECT setval('tag_assignments_id_seq', GREATEST((SELECT COALESCE(MAX(substring(id FROM '[0-9]+$')::int), 1) FROM tag_assignments), 1), (SELECT COUNT(*) FROM tag_assignments) > 0);
SELECT setval('counts_id_seq', GREATEST((SELECT COALESCE(MAX(substring(id FROM '[0-9]+$')::int), 1) FROM counts), 1), (SELECT COUNT(*) FROM counts) > 0);
SELECT setval('tag_submissions_id_seq', GREATEST((SELECT COALESCE(MAX(substring(id FROM '[0-9]+$')::int), 1) FROM tag_submissions), 1), (SELECT COUNT(*) FROM tag_submissions) > 0);
SELECT setval('unknown_items_id_seq', GREATEST((SELECT COALESCE(MAX(substring(id FROM '[0-9]+$')::int), 1) FROM unknown_items), 1), (SELECT COUNT(*) FROM unknown_items) > 0);
SELECT setval('approvals_id_seq', GREATEST((SELECT COALESCE(MAX(substring(id FROM '[0-9]+$')::int), 1) FROM approvals), 1), (SELECT COUNT(*) FROM approvals) > 0);
SELECT setval('session_reopens_id_seq', GREATEST((SELECT COALESCE(MAX(substring(id FROM '[0-9]+$')::int), 1) FROM session_reopens), 1), (SELECT COUNT(*) FROM session_reopens) > 0);

ALTER TABLE lokasi ADD CONSTRAINT lokasi_gudang_id_fkey FOREIGN KEY (gudang_id) REFERENCES gudang (id);
ALTER TABLE tags ADD CONSTRAINT tags_lokasi_id_fkey FOREIGN KEY (lokasi_id) REFERENCES lokasi (id);
ALTER TABLE opname_sessions ADD CONSTRAINT opname_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES users (id);
ALTER TABLE session_tags ADD CONSTRAINT session_tags_session_id_fkey FOREIGN KEY (session_id) REFERENCES opname_sessions (id);
ALTER TABLE session_tags ADD CONSTRAINT session_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES tags (id);
ALTER TABLE import_rows ADD CONSTRAINT import_rows_session_id_fkey FOREIGN KEY (session_id) REFERENCES opname_sessions (id);
ALTER TABLE snapshot_items ADD CONSTRAINT snapshot_items_session_id_fkey FOREIGN KEY (session_id) REFERENCES opname_sessions (id);
ALTER TABLE snapshot_items ADD CONSTRAINT snapshot_items_gudang_id_fkey FOREIGN KEY (gudang_id) REFERENCES gudang (id);
ALTER TABLE tag_assignments ADD CONSTRAINT tag_assignments_session_id_fkey FOREIGN KEY (session_id) REFERENCES opname_sessions (id);
ALTER TABLE tag_assignments ADD CONSTRAINT tag_assignments_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES tags (id);
ALTER TABLE tag_assignments ADD CONSTRAINT tag_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE counts ADD CONSTRAINT counts_session_id_fkey FOREIGN KEY (session_id) REFERENCES opname_sessions (id);
ALTER TABLE counts ADD CONSTRAINT counts_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES tags (id);
ALTER TABLE counts ADD CONSTRAINT counts_snapshot_item_id_fkey FOREIGN KEY (snapshot_item_id) REFERENCES snapshot_items (id);
ALTER TABLE counts ADD CONSTRAINT counts_counted_by_fkey FOREIGN KEY (counted_by) REFERENCES users (id);
ALTER TABLE tag_submissions ADD CONSTRAINT tag_submissions_session_id_fkey FOREIGN KEY (session_id) REFERENCES opname_sessions (id);
ALTER TABLE tag_submissions ADD CONSTRAINT tag_submissions_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES tags (id);
ALTER TABLE tag_submissions ADD CONSTRAINT tag_submissions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES users (id);
ALTER TABLE unknown_items ADD CONSTRAINT unknown_items_session_id_fkey FOREIGN KEY (session_id) REFERENCES opname_sessions (id);
ALTER TABLE unknown_items ADD CONSTRAINT unknown_items_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES tags (id);
ALTER TABLE unknown_items ADD CONSTRAINT unknown_items_counted_by_fkey FOREIGN KEY (counted_by) REFERENCES users (id);
ALTER TABLE user_devices ADD CONSTRAINT user_devices_session_id_fkey FOREIGN KEY (session_id) REFERENCES opname_sessions (id);
ALTER TABLE user_devices ADD CONSTRAINT user_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE user_devices ADD CONSTRAINT user_devices_bound_by_fkey FOREIGN KEY (bound_by) REFERENCES users (id);
ALTER TABLE approvals ADD CONSTRAINT approvals_session_id_fkey FOREIGN KEY (session_id) REFERENCES opname_sessions (id);
ALTER TABLE approvals ADD CONSTRAINT approvals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users (id);
ALTER TABLE session_reopens ADD CONSTRAINT session_reopens_session_id_fkey FOREIGN KEY (session_id) REFERENCES opname_sessions (id);
ALTER TABLE session_reopens ADD CONSTRAINT session_reopens_reopened_by_fkey FOREIGN KEY (reopened_by) REFERENCES users (id);
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
