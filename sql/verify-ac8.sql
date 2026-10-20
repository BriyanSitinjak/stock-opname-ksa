-- AC-8: the seven cases the two reports are judged on.
-- Run this against a freshly seeded database. Every row must say PASS.
-- Cases 5 and 6 are the two bugs that ship silently; if the SQL is wrong they
-- are the ones that fail while everything else looks fine.

\set S  '55555555-5555-5555-5555-000000000001'
\set T11 '44444444-4444-4444-4444-000000000011'
\set T12 '44444444-4444-4444-4444-000000000012'
\set T13 '44444444-4444-4444-4444-000000000013'
\set T21 '44444444-4444-4444-4444-000000000021'
\set T22 '44444444-4444-4444-4444-000000000022'
\set I1234 '66666666-6666-6666-6666-000000001234'
\set I1243 '66666666-6666-6666-6666-000000001243'
\set I1180 '66666666-6666-6666-6666-000000001180'
\set I9001 '66666666-6666-6666-6666-000000009001'
\set BUDI '11111111-1111-1111-1111-000000000003'
\set SARI '11111111-1111-1111-1111-000000000004'
\set AGUS '11111111-1111-1111-1111-000000000005'
\set RINA '11111111-1111-1111-1111-000000000006'

BEGIN;

-- Case 1: both passes agree, and they match the system. Item 1180 on tag 1.1.
INSERT INTO counts (client_row_id, session_id, tag_id, pass, snapshot_item_id, counted_by, qty, kondisi, device_id, client_created_at) VALUES
 (gen_random_uuid(), :'S', :'T11', 1, :'I1180', :'BUDI', 10, 'baik', 'DEV-A', '2026-12-16 09:00+07'),
 (gen_random_uuid(), :'S', :'T11', 2, :'I1180', :'SARI', 10, 'baik', 'DEV-B', '2026-12-16 11:00+07');

-- Case 2: both passes agree, and they differ from the system. Item 1243, onhand 12.
INSERT INTO counts (client_row_id, session_id, tag_id, pass, snapshot_item_id, counted_by, qty, kondisi, device_id, client_created_at) VALUES
 (gen_random_uuid(), :'S', :'T12', 1, :'I1243', :'BUDI', 10, 'baik', 'DEV-A', '2026-12-16 09:10+07'),
 (gen_random_uuid(), :'S', :'T12', 2, :'I1243', :'SARI', 10, 'baik', 'DEV-B', '2026-12-16 11:10+07');

-- Case 3: the two counters disagree. Item 1234 on tag 1.3.
INSERT INTO counts (client_row_id, session_id, tag_id, pass, snapshot_item_id, counted_by, qty, kondisi, device_id, client_created_at) VALUES
 (gen_random_uuid(), :'S', :'T13', 1, :'I1234', :'SARI', 10, 'baik', 'DEV-B', '2026-12-16 09:20+07'),
 (gen_random_uuid(), :'S', :'T13', 2, :'I1234', :'AGUS',  9, 'baik', 'DEV-C', '2026-12-16 11:20+07');

-- Case 5: one counter recorded the item, the other recorded nothing for it.
-- THE COALESCE CASE. Item 1234 on tag 2.1, pass 2 has no row at all.
INSERT INTO counts (client_row_id, session_id, tag_id, pass, snapshot_item_id, counted_by, qty, kondisi, device_id, client_created_at) VALUES
 (gen_random_uuid(), :'S', :'T21', 1, :'I1234', :'AGUS', 10, 'baik', 'DEV-C', '2026-12-16 09:30+07');

-- Case 7: quantity agrees, condition split differs. Item 1180 on tag 2.2.
INSERT INTO counts (client_row_id, session_id, tag_id, pass, snapshot_item_id, counted_by, qty, kondisi, device_id, client_created_at) VALUES
 (gen_random_uuid(), :'S', :'T22', 1, :'I1180', :'AGUS',  8, 'baik',  'DEV-C', '2026-12-16 09:40+07'),
 (gen_random_uuid(), :'S', :'T22', 1, :'I1180', :'AGUS',  2, 'rusak', 'DEV-C', '2026-12-16 09:41+07'),
 (gen_random_uuid(), :'S', :'T22', 2, :'I1180', :'RINA', 10, 'baik',  'DEV-D', '2026-12-16 11:40+07');

-- Case 6 needs no inserts at all. Item 9001 is never counted by anyone.

\echo ''
\echo '=== AC-8, before the third count ==='

SELECT 'AC-8.1 agree, matches system'  AS case,
       CASE WHEN (SELECT qty_agreed FROM v_agreed WHERE tag_id = :'T11' AND snapshot_item_id = :'I1180') = 10
             AND NOT EXISTS (SELECT 1 FROM v_selisih_hitung WHERE tag_id = :'T11')
            THEN 'PASS' ELSE 'FAIL' END AS result
UNION ALL
SELECT 'AC-8.2 agree, differs from system',
       CASE WHEN (SELECT selisih_qty FROM v_selisih_sistem WHERE snapshot_item_id = :'I1243') = -2
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'AC-8.3 disagreement is in selisih hitung',
       CASE WHEN EXISTS (SELECT 1 FROM v_selisih_hitung WHERE tag_id = :'T13' AND snapshot_item_id = :'I1234')
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'AC-8.3 disagreement has no agreed quantity',
       CASE WHEN (SELECT qty_agreed FROM v_agreed WHERE tag_id = :'T13' AND snapshot_item_id = :'I1234') IS NULL
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'AC-8.5 COALESCE, pass 2 recorded nothing',
       CASE WHEN EXISTS (SELECT 1 FROM v_selisih_hitung
                         WHERE tag_id = :'T21' AND snapshot_item_id = :'I1234' AND qty_2 IS NULL)
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'AC-8.5 naive qty_1 <> qty_2 would have hidden it',
       CASE WHEN NOT EXISTS (SELECT 1 FROM v_tag_item
                             WHERE tag_id = :'T21' AND snapshot_item_id = :'I1234' AND qty_1 <> qty_2)
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'AC-8.6 LEFT JOIN, nothing counted at all',
       CASE WHEN (SELECT qty_hitung  FROM v_selisih_sistem WHERE snapshot_item_id = :'I9001') = 0
             AND (SELECT selisih_qty FROM v_selisih_sistem WHERE snapshot_item_id = :'I9001') = -38
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'AC-8.6 zero found report lists it',
       CASE WHEN EXISTS (SELECT 1 FROM v_selisih_sistem
                         WHERE qty_hitung = 0 AND qty_onhand > 0 AND snapshot_item_id = :'I9001')
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'AC-8.7 kondisi split is not a disagreement',
       CASE WHEN NOT EXISTS (SELECT 1 FROM v_selisih_hitung WHERE tag_id = :'T22')
             AND (SELECT qty_agreed FROM v_agreed WHERE tag_id = :'T22' AND snapshot_item_id = :'I1180') = 10
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'AC-8.10 value uses the pinned price',
       CASE WHEN (SELECT selisih_nilai FROM v_selisih_sistem WHERE snapshot_item_id = :'I1243') = -44000
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'AC-5.12 current value is the latest row',
       CASE WHEN (SELECT count(*) FROM v_current_counts
                  WHERE tag_id = :'T11' AND snapshot_item_id = :'I1180' AND pass = 1) = 1
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'AC-8.6 an uncounted item is not a counting dispute',
       CASE WHEN (SELECT ada_selisih_hitung FROM v_selisih_sistem WHERE snapshot_item_id = :'I9001') = false
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'AC-10.2 status is belum before any submission',
       CASE WHEN (SELECT status FROM v_tag_status WHERE tag_id = :'T11') = 'belum'
            THEN 'PASS' ELSE 'FAIL' END;

-- Tag completion. A tag with no count rows is ambiguous: empty, or untouched?
-- Only a person can say, which is why this is a stored fact and not derived.
INSERT INTO tag_submissions (client_row_id, session_id, tag_id, pass, submitted_by, is_empty, device_id, client_created_at) VALUES
 (gen_random_uuid(), :'S', :'T11', 1, :'BUDI', false, 'DEV-A', '2026-12-16 09:05+07'),
 (gen_random_uuid(), :'S', :'T12', 1, :'BUDI', false, 'DEV-A', '2026-12-16 09:15+07'),
 (gen_random_uuid(), :'S', :'T13', 1, :'SARI', false, 'DEV-B', '2026-12-16 09:25+07'),
 (gen_random_uuid(), :'S', :'T21', 1, :'AGUS', false, 'DEV-C', '2026-12-16 09:35+07'),
 (gen_random_uuid(), :'S', :'T22', 1, :'AGUS', false, 'DEV-C', '2026-12-16 09:45+07'),
 (gen_random_uuid(), :'S', '44444444-4444-4444-4444-000000000031', 1, :'RINA', true, 'DEV-D', '2026-12-16 09:55+07');

SELECT 'AC-10.2 status after pass 1 only' AS case,
       CASE WHEN (SELECT status FROM v_tag_status WHERE tag_id = :'T11') = 'menunggu_hitung_2'
            THEN 'PASS' ELSE 'FAIL' END AS result;

INSERT INTO tag_submissions (client_row_id, session_id, tag_id, pass, submitted_by, is_empty, device_id, client_created_at) VALUES
 (gen_random_uuid(), :'S', :'T11', 2, :'SARI', false, 'DEV-B', '2026-12-16 11:05+07'),
 (gen_random_uuid(), :'S', :'T12', 2, :'SARI', false, 'DEV-B', '2026-12-16 11:15+07'),
 (gen_random_uuid(), :'S', :'T13', 2, :'AGUS', false, 'DEV-C', '2026-12-16 11:25+07'),
 -- Pass 2 on tag 2.1 was completed, the counter simply never recorded item 1234.
 (gen_random_uuid(), :'S', :'T21', 2, :'RINA', false, 'DEV-D', '2026-12-16 11:35+07'),
 (gen_random_uuid(), :'S', :'T22', 2, :'RINA', false, 'DEV-D', '2026-12-16 11:45+07'),
 (gen_random_uuid(), :'S', '44444444-4444-4444-4444-000000000031', 2, :'BUDI', true, 'DEV-A', '2026-12-16 11:55+07');

-- Case 4: a third count resolves the disagreement on tag 1.3.
INSERT INTO counts (client_row_id, session_id, tag_id, pass, snapshot_item_id, counted_by, qty, kondisi, device_id, client_created_at) VALUES
 (gen_random_uuid(), :'S', :'T13', 3, :'I1234', :'RINA', 10, 'baik', 'DEV-D', '2026-12-16 14:00+07');

\echo ''
\echo '=== AC-8.4, after the third count ==='

SELECT 'AC-8.4 third count resolves it' AS case,
       CASE WHEN NOT EXISTS (SELECT 1 FROM v_selisih_hitung WHERE tag_id = :'T13')
             AND (SELECT qty_agreed FROM v_agreed WHERE tag_id = :'T13' AND snapshot_item_id = :'I1234') = 10
            THEN 'PASS' ELSE 'FAIL' END AS result
UNION ALL
SELECT 'AC-8.4 a third count always wins',
       CASE WHEN (SELECT qty_3 FROM v_tag_item WHERE tag_id = :'T13' AND snapshot_item_id = :'I1234') = 10
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'AC-9.4 tag 2.1 still blocks review',
       CASE WHEN EXISTS (SELECT 1 FROM v_selisih_hitung WHERE session_id = :'S')
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'AC-10.2 selisih hitung shows on the denah',
       CASE WHEN (SELECT status FROM v_tag_status WHERE tag_id = :'T21') = 'selisih_hitung'
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'AC-6.3 an empty tag is kosong, not belum',
       CASE WHEN (SELECT status FROM v_tag_status
                  WHERE tag_id = '44444444-4444-4444-4444-000000000031') = 'kosong'
            THEN 'PASS' ELSE 'FAIL' END
UNION ALL
SELECT 'AC-10.2 agreed tags read selesai',
       CASE WHEN (SELECT status FROM v_tag_status WHERE tag_id = :'T11') = 'selesai'
             AND (SELECT status FROM v_tag_status WHERE tag_id = :'T13') = 'selesai'
            THEN 'PASS' ELSE 'FAIL' END;

\echo ''
\echo '=== Selisih sistem, the report accounting receives ==='
SELECT barcode_4, nama_barang, qty_onhand, qty_hitung, selisih_qty, selisih_nilai, ada_selisih_hitung
FROM   v_selisih_sistem WHERE session_id = :'S' ORDER BY barcode_4;

\echo ''
\echo '=== Denah status, derived and never stored ==='
SELECT lokasi_nama, nomor, weight, status FROM v_tag_status
WHERE session_id = :'S' ORDER BY lokasi_nama, urutan;

ROLLBACK;
