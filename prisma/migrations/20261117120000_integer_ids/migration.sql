-- Entity ids become integers. client_row_id stays uuid because the phone
-- generates it before any network call.

DROP VIEW IF EXISTS v_tag_status;
DROP VIEW IF EXISTS v_selisih_sistem;
DROP VIEW IF EXISTS v_agreed;
DROP VIEW IF EXISTS v_selisih_hitung;
DROP VIEW IF EXISTS v_tag_item;
DROP VIEW IF EXISTS v_tag_item_pass;
DROP VIEW IF EXISTS v_current_counts;

CREATE FUNCTION pg_temp.fixed_id(u uuid, prefix text) RETURNS int AS $$
DECLARE
  compact text := replace(u::text, '-', '');
  tail text;
BEGIN
  IF compact !~ ('^' || prefix || '[0-9]{12}$') THEN
    RETURN NULL;
  END IF;
  tail := right(compact, 12);
  IF tail::numeric < 1 OR tail::numeric > 2147483647 THEN
    RETURN NULL;
  END IF;
  RETURN tail::int;
END;
$$ LANGUAGE plpgsql;

CREATE TEMP TABLE map_users (old_id uuid PRIMARY KEY, new_id int UNIQUE NOT NULL);
CREATE TEMP TABLE map_gudang (old_id uuid PRIMARY KEY, new_id int UNIQUE NOT NULL);
CREATE TEMP TABLE map_lokasi (old_id uuid PRIMARY KEY, new_id int UNIQUE NOT NULL);
CREATE TEMP TABLE map_tags (old_id uuid PRIMARY KEY, new_id int UNIQUE NOT NULL);
CREATE TEMP TABLE map_sessions (old_id uuid PRIMARY KEY, new_id int UNIQUE NOT NULL);
CREATE TEMP TABLE map_imports (old_id uuid PRIMARY KEY, new_id int UNIQUE NOT NULL);
CREATE TEMP TABLE map_items (old_id uuid PRIMARY KEY, new_id int UNIQUE NOT NULL);
CREATE TEMP TABLE map_assignments (old_id uuid PRIMARY KEY, new_id int UNIQUE NOT NULL);
CREATE TEMP TABLE map_counts (old_id uuid PRIMARY KEY, new_id int UNIQUE NOT NULL);
CREATE TEMP TABLE map_submissions (old_id uuid PRIMARY KEY, new_id int UNIQUE NOT NULL);
CREATE TEMP TABLE map_unknowns (old_id uuid PRIMARY KEY, new_id int UNIQUE NOT NULL);
CREATE TEMP TABLE map_approvals (old_id uuid PRIMARY KEY, new_id int UNIQUE NOT NULL);
CREATE TEMP TABLE map_reopens (old_id uuid PRIMARY KEY, new_id int UNIQUE NOT NULL);

INSERT INTO map_users (old_id, new_id)
SELECT id, pg_temp.fixed_id(id, '11111111111111111111')
FROM users
WHERE pg_temp.fixed_id(id, '11111111111111111111') IS NOT NULL;
INSERT INTO map_users (old_id, new_id)
SELECT id, COALESCE((SELECT MAX(new_id) FROM map_users), 0) + ROW_NUMBER() OVER (ORDER BY nama, id)
FROM users
WHERE id NOT IN (SELECT old_id FROM map_users);

INSERT INTO map_gudang (old_id, new_id)
SELECT id, pg_temp.fixed_id(id, '22222222222222222222')
FROM gudang
WHERE pg_temp.fixed_id(id, '22222222222222222222') IS NOT NULL;
INSERT INTO map_gudang (old_id, new_id)
SELECT id, COALESCE((SELECT MAX(new_id) FROM map_gudang), 0) + ROW_NUMBER() OVER (ORDER BY urutan, kode, id)
FROM gudang
WHERE id NOT IN (SELECT old_id FROM map_gudang);

INSERT INTO map_lokasi (old_id, new_id)
SELECT id, pg_temp.fixed_id(id, '33333333333333333333')
FROM lokasi
WHERE pg_temp.fixed_id(id, '33333333333333333333') IS NOT NULL;
INSERT INTO map_lokasi (old_id, new_id)
SELECT id, COALESCE((SELECT MAX(new_id) FROM map_lokasi), 0) + ROW_NUMBER() OVER (ORDER BY urutan, nama, id)
FROM lokasi
WHERE id NOT IN (SELECT old_id FROM map_lokasi);

INSERT INTO map_tags (old_id, new_id)
SELECT id, pg_temp.fixed_id(id, '44444444444444444444')
FROM tags
WHERE pg_temp.fixed_id(id, '44444444444444444444') IS NOT NULL;
INSERT INTO map_tags (old_id, new_id)
SELECT id, COALESCE((SELECT MAX(new_id) FROM map_tags), 0) + ROW_NUMBER() OVER (ORDER BY urutan, nomor, id)
FROM tags
WHERE id NOT IN (SELECT old_id FROM map_tags);

INSERT INTO map_sessions (old_id, new_id)
SELECT id, pg_temp.fixed_id(id, '55555555555555555555')
FROM opname_sessions
WHERE pg_temp.fixed_id(id, '55555555555555555555') IS NOT NULL;
INSERT INTO map_sessions (old_id, new_id)
SELECT id, COALESCE((SELECT MAX(new_id) FROM map_sessions), 0) + ROW_NUMBER() OVER (ORDER BY created_at, id)
FROM opname_sessions
WHERE id NOT IN (SELECT old_id FROM map_sessions);

INSERT INTO map_imports (old_id, new_id)
SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) FROM import_rows;

INSERT INTO map_items (old_id, new_id)
SELECT id, pg_temp.fixed_id(id, '66666666666666666666')
FROM snapshot_items
WHERE pg_temp.fixed_id(id, '66666666666666666666') IS NOT NULL;
INSERT INTO map_items (old_id, new_id)
SELECT id, COALESCE((SELECT MAX(new_id) FROM map_items), 0) + ROW_NUMBER() OVER (ORDER BY kode_barang, id)
FROM snapshot_items
WHERE id NOT IN (SELECT old_id FROM map_items);

INSERT INTO map_assignments (old_id, new_id)
SELECT id, ROW_NUMBER() OVER (ORDER BY assigned_at, id) FROM tag_assignments;

INSERT INTO map_counts (old_id, new_id)
SELECT id, ROW_NUMBER() OVER (ORDER BY client_created_at, id) FROM counts;

INSERT INTO map_submissions (old_id, new_id)
SELECT id, ROW_NUMBER() OVER (ORDER BY client_created_at, id) FROM tag_submissions;

INSERT INTO map_unknowns (old_id, new_id)
SELECT id, ROW_NUMBER() OVER (ORDER BY client_created_at, id) FROM unknown_items;

INSERT INTO map_approvals (old_id, new_id)
SELECT id, ROW_NUMBER() OVER (ORDER BY approved_at, id) FROM approvals;

INSERT INTO map_reopens (old_id, new_id)
SELECT id, ROW_NUMBER() OVER (ORDER BY reopened_at, id) FROM session_reopens;

ALTER TABLE users ADD COLUMN id_new integer;
ALTER TABLE gudang ADD COLUMN id_new integer;
ALTER TABLE lokasi ADD COLUMN id_new integer, ADD COLUMN gudang_id_new integer;
ALTER TABLE tags ADD COLUMN id_new integer, ADD COLUMN lokasi_id_new integer;
ALTER TABLE opname_sessions ADD COLUMN id_new integer, ADD COLUMN created_by_new integer;
ALTER TABLE session_tags ADD COLUMN session_id_new integer, ADD COLUMN tag_id_new integer;
ALTER TABLE import_rows ADD COLUMN id_new integer, ADD COLUMN session_id_new integer;
ALTER TABLE snapshot_items ADD COLUMN id_new integer, ADD COLUMN session_id_new integer, ADD COLUMN gudang_id_new integer;
ALTER TABLE tag_assignments ADD COLUMN id_new integer, ADD COLUMN session_id_new integer, ADD COLUMN tag_id_new integer, ADD COLUMN user_id_new integer;
ALTER TABLE counts ADD COLUMN id_new integer, ADD COLUMN session_id_new integer, ADD COLUMN tag_id_new integer, ADD COLUMN snapshot_item_id_new integer, ADD COLUMN counted_by_new integer;
ALTER TABLE tag_submissions ADD COLUMN id_new integer, ADD COLUMN session_id_new integer, ADD COLUMN tag_id_new integer, ADD COLUMN submitted_by_new integer;
ALTER TABLE unknown_items ADD COLUMN id_new integer, ADD COLUMN session_id_new integer, ADD COLUMN tag_id_new integer, ADD COLUMN counted_by_new integer;
ALTER TABLE user_devices ADD COLUMN session_id_new integer, ADD COLUMN user_id_new integer, ADD COLUMN bound_by_new integer;
ALTER TABLE approvals ADD COLUMN id_new integer, ADD COLUMN session_id_new integer, ADD COLUMN approved_by_new integer;
ALTER TABLE session_reopens ADD COLUMN id_new integer, ADD COLUMN session_id_new integer, ADD COLUMN reopened_by_new integer;

UPDATE users u SET id_new = m.new_id FROM map_users m WHERE u.id = m.old_id;
UPDATE gudang g SET id_new = m.new_id FROM map_gudang m WHERE g.id = m.old_id;
UPDATE lokasi l SET id_new = m.new_id FROM map_lokasi m WHERE l.id = m.old_id;
UPDATE lokasi l SET gudang_id_new = m.new_id FROM map_gudang m WHERE l.gudang_id = m.old_id;
UPDATE tags t SET id_new = m.new_id FROM map_tags m WHERE t.id = m.old_id;
UPDATE tags t SET lokasi_id_new = m.new_id FROM map_lokasi m WHERE t.lokasi_id = m.old_id;
UPDATE opname_sessions s SET id_new = m.new_id FROM map_sessions m WHERE s.id = m.old_id;
UPDATE opname_sessions s SET created_by_new = m.new_id FROM map_users m WHERE s.created_by = m.old_id;
UPDATE session_tags s SET session_id_new = m.new_id FROM map_sessions m WHERE s.session_id = m.old_id;
UPDATE session_tags s SET tag_id_new = m.new_id FROM map_tags m WHERE s.tag_id = m.old_id;
UPDATE import_rows r SET id_new = m.new_id FROM map_imports m WHERE r.id = m.old_id;
UPDATE import_rows r SET session_id_new = m.new_id FROM map_sessions m WHERE r.session_id = m.old_id;
UPDATE snapshot_items i SET id_new = m.new_id FROM map_items m WHERE i.id = m.old_id;
UPDATE snapshot_items i SET session_id_new = m.new_id FROM map_sessions m WHERE i.session_id = m.old_id;
UPDATE snapshot_items i SET gudang_id_new = m.new_id FROM map_gudang m WHERE i.gudang_id = m.old_id;
UPDATE tag_assignments a SET id_new = m.new_id FROM map_assignments m WHERE a.id = m.old_id;
UPDATE tag_assignments a SET session_id_new = m.new_id FROM map_sessions m WHERE a.session_id = m.old_id;
UPDATE tag_assignments a SET tag_id_new = m.new_id FROM map_tags m WHERE a.tag_id = m.old_id;
UPDATE tag_assignments a SET user_id_new = m.new_id FROM map_users m WHERE a.user_id = m.old_id;
UPDATE counts c SET id_new = m.new_id FROM map_counts m WHERE c.id = m.old_id;
UPDATE counts c SET session_id_new = m.new_id FROM map_sessions m WHERE c.session_id = m.old_id;
UPDATE counts c SET tag_id_new = m.new_id FROM map_tags m WHERE c.tag_id = m.old_id;
UPDATE counts c SET snapshot_item_id_new = m.new_id FROM map_items m WHERE c.snapshot_item_id = m.old_id;
UPDATE counts c SET counted_by_new = m.new_id FROM map_users m WHERE c.counted_by = m.old_id;
UPDATE tag_submissions t SET id_new = m.new_id FROM map_submissions m WHERE t.id = m.old_id;
UPDATE tag_submissions t SET session_id_new = m.new_id FROM map_sessions m WHERE t.session_id = m.old_id;
UPDATE tag_submissions t SET tag_id_new = m.new_id FROM map_tags m WHERE t.tag_id = m.old_id;
UPDATE tag_submissions t SET submitted_by_new = m.new_id FROM map_users m WHERE t.submitted_by = m.old_id;
UPDATE unknown_items u SET id_new = m.new_id FROM map_unknowns m WHERE u.id = m.old_id;
UPDATE unknown_items u SET session_id_new = m.new_id FROM map_sessions m WHERE u.session_id = m.old_id;
UPDATE unknown_items u SET tag_id_new = m.new_id FROM map_tags m WHERE u.tag_id = m.old_id;
UPDATE unknown_items u SET counted_by_new = m.new_id FROM map_users m WHERE u.counted_by = m.old_id;
UPDATE user_devices d SET session_id_new = m.new_id FROM map_sessions m WHERE d.session_id = m.old_id;
UPDATE user_devices d SET user_id_new = m.new_id FROM map_users m WHERE d.user_id = m.old_id;
UPDATE user_devices d SET bound_by_new = m.new_id FROM map_users m WHERE d.bound_by = m.old_id;
UPDATE approvals a SET id_new = m.new_id FROM map_approvals m WHERE a.id = m.old_id;
UPDATE approvals a SET session_id_new = m.new_id FROM map_sessions m WHERE a.session_id = m.old_id;
UPDATE approvals a SET approved_by_new = m.new_id FROM map_users m WHERE a.approved_by = m.old_id;
UPDATE session_reopens r SET id_new = m.new_id FROM map_reopens m WHERE r.id = m.old_id;
UPDATE session_reopens r SET session_id_new = m.new_id FROM map_sessions m WHERE r.session_id = m.old_id;
UPDATE session_reopens r SET reopened_by_new = m.new_id FROM map_users m WHERE r.reopened_by = m.old_id;

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
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, c.conname
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public' AND c.contype IN ('p', 'u')
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE users DROP COLUMN id;
ALTER TABLE gudang DROP COLUMN id;
ALTER TABLE lokasi DROP COLUMN id, DROP COLUMN gudang_id;
ALTER TABLE tags DROP COLUMN id, DROP COLUMN lokasi_id;
ALTER TABLE opname_sessions DROP COLUMN id, DROP COLUMN created_by;
ALTER TABLE session_tags DROP COLUMN session_id, DROP COLUMN tag_id;
ALTER TABLE import_rows DROP COLUMN id, DROP COLUMN session_id;
ALTER TABLE snapshot_items DROP COLUMN id, DROP COLUMN session_id, DROP COLUMN gudang_id;
ALTER TABLE tag_assignments DROP COLUMN id, DROP COLUMN session_id, DROP COLUMN tag_id, DROP COLUMN user_id;
ALTER TABLE counts DROP COLUMN id, DROP COLUMN session_id, DROP COLUMN tag_id, DROP COLUMN snapshot_item_id, DROP COLUMN counted_by;
ALTER TABLE tag_submissions DROP COLUMN id, DROP COLUMN session_id, DROP COLUMN tag_id, DROP COLUMN submitted_by;
ALTER TABLE unknown_items DROP COLUMN id, DROP COLUMN session_id, DROP COLUMN tag_id, DROP COLUMN counted_by;
ALTER TABLE user_devices DROP COLUMN session_id, DROP COLUMN user_id, DROP COLUMN bound_by;
ALTER TABLE approvals DROP COLUMN id, DROP COLUMN session_id, DROP COLUMN approved_by;
ALTER TABLE session_reopens DROP COLUMN id, DROP COLUMN session_id, DROP COLUMN reopened_by;

ALTER TABLE users RENAME COLUMN id_new TO id;
ALTER TABLE gudang RENAME COLUMN id_new TO id;
ALTER TABLE lokasi RENAME COLUMN id_new TO id;
ALTER TABLE lokasi RENAME COLUMN gudang_id_new TO gudang_id;
ALTER TABLE tags RENAME COLUMN id_new TO id;
ALTER TABLE tags RENAME COLUMN lokasi_id_new TO lokasi_id;
ALTER TABLE opname_sessions RENAME COLUMN id_new TO id;
ALTER TABLE opname_sessions RENAME COLUMN created_by_new TO created_by;
ALTER TABLE session_tags RENAME COLUMN session_id_new TO session_id;
ALTER TABLE session_tags RENAME COLUMN tag_id_new TO tag_id;
ALTER TABLE import_rows RENAME COLUMN id_new TO id;
ALTER TABLE import_rows RENAME COLUMN session_id_new TO session_id;
ALTER TABLE snapshot_items RENAME COLUMN id_new TO id;
ALTER TABLE snapshot_items RENAME COLUMN session_id_new TO session_id;
ALTER TABLE snapshot_items RENAME COLUMN gudang_id_new TO gudang_id;
ALTER TABLE tag_assignments RENAME COLUMN id_new TO id;
ALTER TABLE tag_assignments RENAME COLUMN session_id_new TO session_id;
ALTER TABLE tag_assignments RENAME COLUMN tag_id_new TO tag_id;
ALTER TABLE tag_assignments RENAME COLUMN user_id_new TO user_id;
ALTER TABLE counts RENAME COLUMN id_new TO id;
ALTER TABLE counts RENAME COLUMN session_id_new TO session_id;
ALTER TABLE counts RENAME COLUMN tag_id_new TO tag_id;
ALTER TABLE counts RENAME COLUMN snapshot_item_id_new TO snapshot_item_id;
ALTER TABLE counts RENAME COLUMN counted_by_new TO counted_by;
ALTER TABLE tag_submissions RENAME COLUMN id_new TO id;
ALTER TABLE tag_submissions RENAME COLUMN session_id_new TO session_id;
ALTER TABLE tag_submissions RENAME COLUMN tag_id_new TO tag_id;
ALTER TABLE tag_submissions RENAME COLUMN submitted_by_new TO submitted_by;
ALTER TABLE unknown_items RENAME COLUMN id_new TO id;
ALTER TABLE unknown_items RENAME COLUMN session_id_new TO session_id;
ALTER TABLE unknown_items RENAME COLUMN tag_id_new TO tag_id;
ALTER TABLE unknown_items RENAME COLUMN counted_by_new TO counted_by;
ALTER TABLE user_devices RENAME COLUMN session_id_new TO session_id;
ALTER TABLE user_devices RENAME COLUMN user_id_new TO user_id;
ALTER TABLE user_devices RENAME COLUMN bound_by_new TO bound_by;
ALTER TABLE approvals RENAME COLUMN id_new TO id;
ALTER TABLE approvals RENAME COLUMN session_id_new TO session_id;
ALTER TABLE approvals RENAME COLUMN approved_by_new TO approved_by;
ALTER TABLE session_reopens RENAME COLUMN id_new TO id;
ALTER TABLE session_reopens RENAME COLUMN session_id_new TO session_id;
ALTER TABLE session_reopens RENAME COLUMN reopened_by_new TO reopened_by;

ALTER TABLE users ALTER COLUMN id SET NOT NULL;
ALTER TABLE gudang ALTER COLUMN id SET NOT NULL;
ALTER TABLE lokasi ALTER COLUMN id SET NOT NULL;
ALTER TABLE lokasi ALTER COLUMN gudang_id SET NOT NULL;
ALTER TABLE tags ALTER COLUMN id SET NOT NULL;
ALTER TABLE tags ALTER COLUMN lokasi_id SET NOT NULL;
ALTER TABLE opname_sessions ALTER COLUMN id SET NOT NULL;
ALTER TABLE session_tags ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE session_tags ALTER COLUMN tag_id SET NOT NULL;
ALTER TABLE import_rows ALTER COLUMN id SET NOT NULL;
ALTER TABLE import_rows ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE snapshot_items ALTER COLUMN id SET NOT NULL;
ALTER TABLE snapshot_items ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE snapshot_items ALTER COLUMN gudang_id SET NOT NULL;
ALTER TABLE tag_assignments ALTER COLUMN id SET NOT NULL;
ALTER TABLE tag_assignments ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE tag_assignments ALTER COLUMN tag_id SET NOT NULL;
ALTER TABLE tag_assignments ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE counts ALTER COLUMN id SET NOT NULL;
ALTER TABLE counts ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE counts ALTER COLUMN tag_id SET NOT NULL;
ALTER TABLE counts ALTER COLUMN snapshot_item_id SET NOT NULL;
ALTER TABLE counts ALTER COLUMN counted_by SET NOT NULL;
ALTER TABLE tag_submissions ALTER COLUMN id SET NOT NULL;
ALTER TABLE tag_submissions ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE tag_submissions ALTER COLUMN tag_id SET NOT NULL;
ALTER TABLE tag_submissions ALTER COLUMN submitted_by SET NOT NULL;
ALTER TABLE unknown_items ALTER COLUMN id SET NOT NULL;
ALTER TABLE unknown_items ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE unknown_items ALTER COLUMN tag_id SET NOT NULL;
ALTER TABLE unknown_items ALTER COLUMN counted_by SET NOT NULL;
ALTER TABLE user_devices ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE user_devices ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE approvals ALTER COLUMN id SET NOT NULL;
ALTER TABLE approvals ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE approvals ALTER COLUMN approved_by SET NOT NULL;
ALTER TABLE session_reopens ALTER COLUMN id SET NOT NULL;
ALTER TABLE session_reopens ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE session_reopens ALTER COLUMN reopened_by SET NOT NULL;

ALTER TABLE users ADD PRIMARY KEY (id);
ALTER TABLE gudang ADD PRIMARY KEY (id);
ALTER TABLE lokasi ADD PRIMARY KEY (id);
ALTER TABLE tags ADD PRIMARY KEY (id);
ALTER TABLE opname_sessions ADD PRIMARY KEY (id);
ALTER TABLE session_tags ADD PRIMARY KEY (session_id, tag_id);
ALTER TABLE import_rows ADD PRIMARY KEY (id);
ALTER TABLE snapshot_items ADD PRIMARY KEY (id);
ALTER TABLE tag_assignments ADD PRIMARY KEY (id);
ALTER TABLE counts ADD PRIMARY KEY (id);
ALTER TABLE tag_submissions ADD PRIMARY KEY (id);
ALTER TABLE unknown_items ADD PRIMARY KEY (id);
ALTER TABLE user_devices ADD PRIMARY KEY (session_id, device_id);
ALTER TABLE approvals ADD PRIMARY KEY (id);
ALTER TABLE session_reopens ADD PRIMARY KEY (id);

ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
ALTER TABLE gudang ADD CONSTRAINT gudang_kode_key UNIQUE (kode);
ALTER TABLE lokasi ADD CONSTRAINT lokasi_gudang_id_nama_key UNIQUE (gudang_id, nama);
ALTER TABLE tags ADD CONSTRAINT tags_lokasi_id_nomor_key UNIQUE (lokasi_id, nomor);
ALTER TABLE snapshot_items ADD CONSTRAINT snapshot_items_session_id_gudang_id_kode_barang_key UNIQUE (session_id, gudang_id, kode_barang);
ALTER TABLE tag_assignments ADD CONSTRAINT tag_assignments_session_id_tag_id_pass_key UNIQUE (session_id, tag_id, pass);
ALTER TABLE counts ADD CONSTRAINT counts_client_row_id_key UNIQUE (client_row_id);
ALTER TABLE tag_submissions ADD CONSTRAINT tag_submissions_client_row_id_key UNIQUE (client_row_id);
ALTER TABLE unknown_items ADD CONSTRAINT unknown_items_client_row_id_key UNIQUE (client_row_id);
ALTER TABLE approvals ADD CONSTRAINT approvals_session_id_step_key UNIQUE (session_id, step);

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

ALTER TABLE users ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE gudang ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE lokasi ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE tags ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE opname_sessions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE import_rows ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE snapshot_items ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE tag_assignments ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE counts ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE tag_submissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE unknown_items ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE approvals ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE session_reopens ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;

CREATE INDEX counts_session_tag_pass_idx ON counts (session_id, tag_id, pass);
CREATE INDEX snapshot_items_barcode_idx ON snapshot_items (session_id, barcode_4);
CREATE INDEX session_tags_render_idx ON session_tags (session_id, gudang_nama, lokasi_nama, urutan);
CREATE UNIQUE INDEX user_devices_one_live_per_user ON user_devices (session_id, user_id) WHERE released_at IS NULL;

DO $$
DECLARE
  tbl text;
  seq text;
  max_id int;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users', 'gudang', 'lokasi', 'tags', 'opname_sessions', 'import_rows',
    'snapshot_items', 'tag_assignments', 'counts', 'tag_submissions',
    'unknown_items', 'approvals', 'session_reopens'
  ]
  LOOP
    seq := pg_get_serial_sequence(tbl, 'id');
    EXECUTE format('SELECT MAX(id) FROM %I', tbl) INTO max_id;
    IF max_id IS NULL THEN
      PERFORM setval(seq, 1, false);
    ELSE
      PERFORM setval(seq, max_id, true);
    END IF;
  END LOOP;
END $$;
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
