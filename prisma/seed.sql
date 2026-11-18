-- stock-opname seed. Tags and snapshot items stay the Stage 7
-- acceptance-criteria fixture (item 9001).
-- Admin and reviewer rows are the real roster. A user has one role.
-- Briyan is the only admin. Ardian and Kepala Gudang are reviewers.
-- The other named staff are counters.
-- Ids are prefix-number text: usr-1, ses-1, tag-11, itm-1234.

BEGIN;

TRUNCATE session_reopens, approvals, user_devices, unknown_items, tag_submissions, counts,
         tag_assignments, snapshot_items, import_rows, session_tags,
         opname_sessions, tags, lokasi, gudang, users RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------- pengguna
INSERT INTO users (id, nama, username, password_hash, role) VALUES
 ('usr-1','Briyan',         'briyan',       '$argon2id$PLACEHOLDER','admin'),
 ('usr-16','Ardian',         'ardian',       '$argon2id$PLACEHOLDER','reviewer'),
 ('usr-17','Kepala Gudang',  'kepalagudang', '$argon2id$PLACEHOLDER','reviewer'),
 ('usr-2','Parmadi',        'parmadi',      '$argon2id$PLACEHOLDER','counter'),
 ('usr-7','Dufi',           'dufi',         '$argon2id$PLACEHOLDER','counter'),
 ('usr-8','Yulius',         'yulius',       '$argon2id$PLACEHOLDER','counter'),
 ('usr-9','Nelly',          'nelly',        '$argon2id$PLACEHOLDER','counter'),
 ('usr-10','Kenny',          'kenny',        '$argon2id$PLACEHOLDER','counter'),
 ('usr-11','Okky',           'okky',         '$argon2id$PLACEHOLDER','counter'),
 ('usr-12','Aisia',          'aisia',        '$argon2id$PLACEHOLDER','counter'),
 ('usr-13','Afang',          'afang',        '$argon2id$PLACEHOLDER','counter'),
 ('usr-14','Natalia',        'natalia',      '$argon2id$PLACEHOLDER','counter'),
 ('usr-15','Mukcin',         'mukcin',       '$argon2id$PLACEHOLDER','counter');

-- ------------------------------------------------------------------ gudang
INSERT INTO gudang (id, kode, nama, urutan) VALUES
 ('gdg-1','G01','GUDANG 01',1),
 ('gdg-2','G02','GUDANG 02',2),
 ('gdg-3','G03','GUDANG 03',3),
 ('gdg-4','LAB','LAB KOSAMBI',4);

INSERT INTO lokasi (id, gudang_id, nama, urutan) VALUES
 ('lok-1','gdg-1','Lokasi I',  1),
 ('lok-2','gdg-1','Lokasi II', 2),
 ('lok-3','gdg-1','Lokasi III',3);

INSERT INTO tags (id, lokasi_id, nomor, weight, urutan) VALUES
 ('tag-11','lok-1','1.1',3,1),
 ('tag-12','lok-1','1.2',2,2),
 ('tag-13','lok-1','1.3',1,3),
 ('tag-21','lok-2','2.1',3,1),
 ('tag-22','lok-2','2.2',2,2),
 ('tag-31','lok-3','3.1',1,1);

-- -------------------------------------------------------------------- sesi
INSERT INTO opname_sessions (id, nama, periode, snapshot_at, scope_filter, status, created_by) VALUES
 ('ses-1','Opname Tahunan 2026','2026-12','2026-12-15 18:00+07',
  '{"brands":["Asia","Platinum","Infinity","Renovo"],"groups":["Material"]}'::jsonb,
  'counting','usr-1');

-- The pin, written at draft -> open. Reports read this, never `tags`.
INSERT INTO session_tags (session_id, tag_id, nomor, lokasi_nama, gudang_nama, weight, urutan)
SELECT 'ses-1', t.id, t.nomor, l.nama, g.nama, t.weight, t.urutan
FROM   tags t
JOIN   lokasi l ON l.id = t.lokasi_id
JOIN   gudang g ON g.id = l.gudang_id
WHERE  t.retired_at IS NULL AND l.retired_at IS NULL AND g.retired_at IS NULL;

-- --------------------------------------------------------------- snapshot
-- 7777 SHERWIN is in the source file and must NOT reach snapshot_items,
-- because the scope filter excludes it. That is AC-4.6.
INSERT INTO import_rows (session_id, row_number, raw) VALUES
 ('ses-1', 1,
  '{"Nama_Gudang":"GUDANG 01","Kode_Barang":"SW-XX-1L","Nama_Barang":"SHERWIN SAMPLE 1L","Nama_Brand":"Sherwin","Qty_OnHand":"25","Harga_Satuan":"95000"}'::jsonb),
 ('ses-1', 2,
  '{"Nama_Gudang":"GUDANG 01","Kode_Barang":"AS-TH-5L","Nama_Barang":"THINNER ASIA 5L","Nama_Brand":"Asia","Qty_OnHand":"0123","Harga_Satuan":"85000"}'::jsonb);

INSERT INTO snapshot_items
 (id, session_id, gudang_id, kode_barang, barcode_4, nama_barang, nama_brand, nama_group, qty_onhand, harga_satuan, source_row_count) VALUES
 ('itm-1234','ses-1','gdg-1',
  'AS-TH-5L','1234','THINNER ASIA 5L','Asia','Material',40,85000,3),
 ('itm-1243','ses-1','gdg-1',
  'AS-TH-1L','1243','THINNER ASIA 1L','Asia','Material',12,22000,1),
 ('itm-1180','ses-1','gdg-1',
  'PL-CT-1L','1180','CAT PLATINUM PUTIH 1L','Platinum','Material',10,120000,1),
 ('itm-9001','ses-1','gdg-1',
  'IN-SL-20L','9001','INFINITY SEALER 20L','Infinity','Material',38,410000,1);

SELECT setval('users_id_seq', (SELECT MAX(substring(id FROM '[0-9]+$')::int) FROM users));
SELECT setval('gudang_id_seq', (SELECT MAX(substring(id FROM '[0-9]+$')::int) FROM gudang));
SELECT setval('lokasi_id_seq', (SELECT MAX(substring(id FROM '[0-9]+$')::int) FROM lokasi));
SELECT setval('tags_id_seq', (SELECT MAX(substring(id FROM '[0-9]+$')::int) FROM tags));
SELECT setval('opname_sessions_id_seq', (SELECT MAX(substring(id FROM '[0-9]+$')::int) FROM opname_sessions));
SELECT setval('import_rows_id_seq', (SELECT COALESCE(MAX(substring(id FROM '[0-9]+$')::int), 1) FROM import_rows), (SELECT COUNT(*) FROM import_rows) > 0);
SELECT setval('snapshot_items_id_seq', (SELECT MAX(substring(id FROM '[0-9]+$')::int) FROM snapshot_items));

COMMIT;
