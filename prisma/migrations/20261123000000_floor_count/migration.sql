CREATE SEQUENCE master_items_id_seq;

CREATE TABLE master_items (
  id               text PRIMARY KEY DEFAULT ('mst-' || nextval('master_items_id_seq')),
  gudang_id        text NOT NULL REFERENCES gudang (id),
  kode_barang      text NOT NULL,
  barcode_4        text,
  nama_barang      text NOT NULL,
  kode_brand       text,
  nama_brand       text,
  kode_group       text,
  nama_group       text,
  uom              text,
  qty_onhand       numeric(18, 4) NOT NULL,
  harga_satuan     numeric(18, 2),
  source_row_count integer NOT NULL DEFAULT 1,
  CONSTRAINT master_items_id_prefix CHECK (id ~ '^mst-[1-9][0-9]*$'),
  CONSTRAINT master_items_gudang_id_prefix CHECK (gudang_id ~ '^gdg-[1-9][0-9]*$'),
  UNIQUE (gudang_id, kode_barang)
);

ALTER SEQUENCE master_items_id_seq OWNED BY master_items.id;

CREATE TABLE aisle_marks (
  session_id text NOT NULL REFERENCES opname_sessions (id),
  gudang     integer NOT NULL,
  aisle      text NOT NULL,
  note       text NOT NULL DEFAULT '',
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, gudang, aisle),
  CONSTRAINT aisle_marks_session_id_prefix CHECK (session_id ~ '^ses-[1-9][0-9]*$')
);

CREATE TABLE aisle_assignments (
  session_id text NOT NULL REFERENCES opname_sessions (id),
  gudang     integer NOT NULL,
  aisle      text NOT NULL,
  pass       smallint NOT NULL,
  user_id    text NOT NULL REFERENCES users (id),
  PRIMARY KEY (session_id, gudang, aisle, pass),
  CONSTRAINT aisle_assignments_session_id_prefix CHECK (session_id ~ '^ses-[1-9][0-9]*$'),
  CONSTRAINT aisle_assignments_user_id_prefix CHECK (user_id ~ '^usr-[1-9][0-9]*$'),
  CONSTRAINT aisle_assignments_pass_check CHECK (pass IN (1, 2))
);

ALTER TABLE counts ADD COLUMN nomor_kartu text;
ALTER TABLE tag_submissions ADD COLUMN nomor_kartu text;

-- Floor places. Applying this retires the sample Lokasi I–III from the master
-- list. The session that is already pinned keeps its own copy.
INSERT INTO gudang (kode, nama, urutan)
SELECT v.kode, v.nama, v.urutan
FROM (VALUES
  ('G17', 'Gudang 17', 17),
  ('G18', 'Gudang 18', 18),
  ('G19', 'Gudang 19', 19),
  ('G20', 'Gudang 20', 20),
  ('G21', 'Gudang 21', 21),
  ('G22', 'Gudang 22', 22)
) AS v(kode, nama, urutan)
WHERE NOT EXISTS (SELECT 1 FROM gudang g WHERE g.kode = v.kode);

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'A', 1
FROM gudang g
WHERE g.kode = 'G17'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-1-A', 1, 1
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-1-B', 1, 2
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-2-A', 1, 3
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-2-B', 1, 4
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-3-A', 1, 5
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-3-B', 1, 6
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-4-A', 1, 7
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-4-B', 1, 8
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-5-A', 1, 9
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-5-B', 1, 10
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-6-A', 1, 11
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-6-B', 1, 12
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-7-A', 1, 13
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-7-B', 1, 14
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-8-A', 1, 15
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-8-B', 1, 16
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-9-A', 1, 17
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-9-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-9-B', 1, 18
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-9-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-10-A', 1, 19
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-10-B', 1, 20
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-11-A', 1, 21
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-11-B', 1, 22
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-12-A', 1, 23
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-12-B', 1, 24
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-13-A', 1, 25
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-13-B', 1, 26
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-14-A', 1, 27
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-14-B', 1, 28
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-15-A', 1, 29
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-15-B', 1, 30
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-16-A', 1, 31
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-16-B', 1, 32
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-18-A', 1, 33
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-18-B', 1, 34
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-19-A', 1, 35
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'A-19-B', 1, 36
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'A-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'B', 2
FROM gudang g
WHERE g.kode = 'G17'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-1-A', 1, 37
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-1-B', 1, 38
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-2-A', 1, 39
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-2-B', 1, 40
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-3-A', 1, 41
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-3-B', 1, 42
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-4-A', 1, 43
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-4-B', 1, 44
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-5-A', 1, 45
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-5-B', 1, 46
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-6-A', 1, 47
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-6-B', 1, 48
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-7-A', 1, 49
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-7-B', 1, 50
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-8-A', 1, 51
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-8-B', 1, 52
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-10-A', 1, 53
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-10-B', 1, 54
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-11-A', 1, 55
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-11-B', 1, 56
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-12-A', 1, 57
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-12-B', 1, 58
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-13-A', 1, 59
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-13-B', 1, 60
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-14-A', 1, 61
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-14-B', 1, 62
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-15-A', 1, 63
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-15-B', 1, 64
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-16-A', 1, 65
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-16-B', 1, 66
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-18-A', 1, 67
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-18-B', 1, 68
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-19-A', 1, 69
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'B-19-B', 1, 70
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'B-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'C', 3
FROM gudang g
WHERE g.kode = 'G17'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'C'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-1-A', 1, 71
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-1-B', 1, 72
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-2-A', 1, 73
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-2-B', 1, 74
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-3-A', 1, 75
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-3-B', 1, 76
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-4-A', 1, 77
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-4-B', 1, 78
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-5-A', 1, 79
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-5-B', 1, 80
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-6-A', 1, 81
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-6-B', 1, 82
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-7-A', 1, 83
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-7-B', 1, 84
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-8-A', 1, 85
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-8-B', 1, 86
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-10-A', 1, 87
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-10-B', 1, 88
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-11-A', 1, 89
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-11-B', 1, 90
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-12-A', 1, 91
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-12-B', 1, 92
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-13-A', 1, 93
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-13-B', 1, 94
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-14-A', 1, 95
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-14-B', 1, 96
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-15-A', 1, 97
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-15-B', 1, 98
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-16-A', 1, 99
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-16-B', 1, 100
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-18-A', 1, 101
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-18-B', 1, 102
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-19-A', 1, 103
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'C-19-B', 1, 104
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'C'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'C-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'D', 4
FROM gudang g
WHERE g.kode = 'G17'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'D'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-1-A', 1, 105
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-1-B', 1, 106
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-2-A', 1, 107
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-2-B', 1, 108
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-3-A', 1, 109
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-3-B', 1, 110
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-4-A', 1, 111
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-4-B', 1, 112
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-5-A', 1, 113
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-5-B', 1, 114
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-6-A', 1, 115
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-6-B', 1, 116
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-7-A', 1, 117
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-7-B', 1, 118
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-8-A', 1, 119
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-8-B', 1, 120
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-9-A', 1, 121
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-9-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-9-B', 1, 122
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-9-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-10-A', 1, 123
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-10-B', 1, 124
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-11-A', 1, 125
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-11-B', 1, 126
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-12-A', 1, 127
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-12-B', 1, 128
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-13-A', 1, 129
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-13-B', 1, 130
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-14-A', 1, 131
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-14-B', 1, 132
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-15-A', 1, 133
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-15-B', 1, 134
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-16-A', 1, 135
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-16-B', 1, 136
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-18-A', 1, 137
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-18-B', 1, 138
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-19-A', 1, 139
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'D-19-B', 1, 140
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G17' AND l.nama = 'D'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'D-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'E', 5
FROM gudang g
WHERE g.kode = 'G18'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'E'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-1-A', 1, 141
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-1-B', 1, 142
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-2-A', 1, 143
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-2-B', 1, 144
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-3-A', 1, 145
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-3-B', 1, 146
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-4-A', 1, 147
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-4-B', 1, 148
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-5-A', 1, 149
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-5-B', 1, 150
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-6-A', 1, 151
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-6-B', 1, 152
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-7-A', 1, 153
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-7-B', 1, 154
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-8-A', 1, 155
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-8-B', 1, 156
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-9-A', 1, 157
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-9-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-9-B', 1, 158
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-9-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-10-A', 1, 159
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-10-B', 1, 160
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-11-A', 1, 161
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-11-B', 1, 162
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-12-A', 1, 163
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-12-B', 1, 164
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-13-A', 1, 165
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-13-B', 1, 166
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-14-A', 1, 167
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-14-B', 1, 168
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-15-A', 1, 169
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-15-B', 1, 170
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-16-A', 1, 171
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-16-B', 1, 172
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-18-A', 1, 173
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-18-B', 1, 174
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-19-A', 1, 175
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'E-19-B', 1, 176
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'E'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'E-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'F', 6
FROM gudang g
WHERE g.kode = 'G18'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'F'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-1-A', 1, 177
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-1-B', 1, 178
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-2-A', 1, 179
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-2-B', 1, 180
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-3-A', 1, 181
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-3-B', 1, 182
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-4-A', 1, 183
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-4-B', 1, 184
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-5-A', 1, 185
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-5-B', 1, 186
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-6-A', 1, 187
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-6-B', 1, 188
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-7-A', 1, 189
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-7-B', 1, 190
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-8-A', 1, 191
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-8-B', 1, 192
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-10-A', 1, 193
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-10-B', 1, 194
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-11-A', 1, 195
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-11-B', 1, 196
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-12-A', 1, 197
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-12-B', 1, 198
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-13-A', 1, 199
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-13-B', 1, 200
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-14-A', 1, 201
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-14-B', 1, 202
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-15-A', 1, 203
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-15-B', 1, 204
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-16-A', 1, 205
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-16-B', 1, 206
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-18-A', 1, 207
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-18-B', 1, 208
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-19-A', 1, 209
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'F-19-B', 1, 210
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'F'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'F-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'G', 7
FROM gudang g
WHERE g.kode = 'G18'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'G'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-1-A', 1, 211
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-1-B', 1, 212
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-2-A', 1, 213
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-2-B', 1, 214
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-3-A', 1, 215
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-3-B', 1, 216
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-4-A', 1, 217
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-4-B', 1, 218
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-5-A', 1, 219
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-5-B', 1, 220
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-6-A', 1, 221
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-6-B', 1, 222
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-7-A', 1, 223
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-7-B', 1, 224
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-8-A', 1, 225
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-8-B', 1, 226
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-10-A', 1, 227
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-10-B', 1, 228
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-11-A', 1, 229
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-11-B', 1, 230
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-12-A', 1, 231
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-12-B', 1, 232
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-13-A', 1, 233
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-13-B', 1, 234
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-14-A', 1, 235
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-14-B', 1, 236
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-15-A', 1, 237
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-15-B', 1, 238
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-16-A', 1, 239
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-16-B', 1, 240
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-18-A', 1, 241
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-18-B', 1, 242
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-19-A', 1, 243
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'G-19-B', 1, 244
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'G'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'G-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'H', 8
FROM gudang g
WHERE g.kode = 'G18'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'H'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-1-A', 1, 245
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-1-B', 1, 246
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-2-A', 1, 247
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-2-B', 1, 248
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-3-A', 1, 249
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-3-B', 1, 250
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-4-A', 1, 251
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-4-B', 1, 252
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-5-A', 1, 253
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-5-B', 1, 254
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-6-A', 1, 255
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-6-B', 1, 256
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-7-A', 1, 257
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-7-B', 1, 258
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-8-A', 1, 259
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-8-B', 1, 260
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-9-A', 1, 261
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-9-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-9-B', 1, 262
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-9-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-10-A', 1, 263
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-10-B', 1, 264
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-11-A', 1, 265
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-11-B', 1, 266
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-12-A', 1, 267
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-12-B', 1, 268
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-13-A', 1, 269
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-13-B', 1, 270
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-14-A', 1, 271
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-14-B', 1, 272
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-15-A', 1, 273
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-15-B', 1, 274
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-16-A', 1, 275
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-16-B', 1, 276
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-18-A', 1, 277
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-18-B', 1, 278
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-19-A', 1, 279
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'H-19-B', 1, 280
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G18' AND l.nama = 'H'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'H-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'I', 9
FROM gudang g
WHERE g.kode = 'G19'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'I'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-1-A', 1, 281
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-1-B', 1, 282
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-2-A', 1, 283
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-2-B', 1, 284
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-3-A', 1, 285
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-3-B', 1, 286
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-4-A', 1, 287
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-4-B', 1, 288
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-5-A', 1, 289
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-5-B', 1, 290
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-6-A', 1, 291
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-6-B', 1, 292
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-7-A', 1, 293
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-7-B', 1, 294
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-8-A', 1, 295
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-8-B', 1, 296
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-9-A', 1, 297
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-9-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-9-B', 1, 298
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-9-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-10-A', 1, 299
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-10-B', 1, 300
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-11-A', 1, 301
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-11-B', 1, 302
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-12-A', 1, 303
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-12-B', 1, 304
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-13-A', 1, 305
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-13-B', 1, 306
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-14-A', 1, 307
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-14-B', 1, 308
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-15-A', 1, 309
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-15-B', 1, 310
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-16-A', 1, 311
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-16-B', 1, 312
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-18-A', 1, 313
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-18-B', 1, 314
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-19-A', 1, 315
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'I-19-B', 1, 316
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'I'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'I-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'J', 10
FROM gudang g
WHERE g.kode = 'G19'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'J'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-1-A', 1, 317
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-1-B', 1, 318
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-2-A', 1, 319
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-2-B', 1, 320
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-3-A', 1, 321
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-3-B', 1, 322
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-4-A', 1, 323
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-4-B', 1, 324
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-5-A', 1, 325
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-5-B', 1, 326
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-6-A', 1, 327
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-6-B', 1, 328
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-7-A', 1, 329
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-7-B', 1, 330
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-8-A', 1, 331
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-8-B', 1, 332
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-10-A', 1, 333
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-10-B', 1, 334
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-11-A', 1, 335
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-11-B', 1, 336
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-12-A', 1, 337
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-12-B', 1, 338
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-13-A', 1, 339
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-13-B', 1, 340
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-14-A', 1, 341
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-14-B', 1, 342
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-15-A', 1, 343
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-15-B', 1, 344
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-16-A', 1, 345
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-16-B', 1, 346
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-18-A', 1, 347
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-18-B', 1, 348
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-19-A', 1, 349
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'J-19-B', 1, 350
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'J'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'J-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'K', 11
FROM gudang g
WHERE g.kode = 'G19'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'K'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-1-A', 1, 351
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-1-B', 1, 352
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-2-A', 1, 353
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-2-B', 1, 354
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-3-A', 1, 355
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-3-B', 1, 356
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-4-A', 1, 357
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-4-B', 1, 358
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-5-A', 1, 359
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-5-B', 1, 360
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-6-A', 1, 361
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-6-B', 1, 362
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-7-A', 1, 363
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-7-B', 1, 364
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-8-A', 1, 365
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-8-B', 1, 366
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-10-A', 1, 367
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-10-B', 1, 368
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-11-A', 1, 369
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-11-B', 1, 370
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-12-A', 1, 371
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-12-B', 1, 372
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-13-A', 1, 373
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-13-B', 1, 374
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-14-A', 1, 375
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-14-B', 1, 376
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-15-A', 1, 377
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-15-B', 1, 378
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-16-A', 1, 379
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-16-B', 1, 380
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-18-A', 1, 381
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-18-B', 1, 382
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-19-A', 1, 383
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'K-19-B', 1, 384
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'K'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'K-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'L', 12
FROM gudang g
WHERE g.kode = 'G19'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'L'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-1-A', 1, 385
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-1-B', 1, 386
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-2-A', 1, 387
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-2-B', 1, 388
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-3-A', 1, 389
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-3-B', 1, 390
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-4-A', 1, 391
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-4-B', 1, 392
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-5-A', 1, 393
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-5-B', 1, 394
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-6-A', 1, 395
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-6-B', 1, 396
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-7-A', 1, 397
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-7-B', 1, 398
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-8-A', 1, 399
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-8-B', 1, 400
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-9-A', 1, 401
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-9-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-9-B', 1, 402
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-9-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-10-A', 1, 403
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-10-B', 1, 404
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-11-A', 1, 405
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-11-B', 1, 406
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-12-A', 1, 407
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-12-B', 1, 408
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-13-A', 1, 409
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-13-B', 1, 410
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-14-A', 1, 411
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-14-B', 1, 412
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-15-A', 1, 413
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-15-B', 1, 414
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-16-A', 1, 415
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-16-B', 1, 416
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-18-A', 1, 417
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-18-B', 1, 418
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-19-A', 1, 419
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'L-19-B', 1, 420
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G19' AND l.nama = 'L'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'L-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'M', 13
FROM gudang g
WHERE g.kode = 'G20'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'M'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-1-A', 1, 421
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-1-B', 1, 422
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-2-A', 1, 423
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-2-B', 1, 424
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-3-A', 1, 425
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-3-B', 1, 426
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-4-A', 1, 427
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-4-B', 1, 428
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-5-A', 1, 429
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-5-B', 1, 430
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-6-A', 1, 431
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-6-B', 1, 432
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-7-A', 1, 433
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-7-B', 1, 434
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-8-A', 1, 435
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-8-B', 1, 436
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-9-A', 1, 437
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-9-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-9-B', 1, 438
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-9-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-10-A', 1, 439
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-10-B', 1, 440
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-11-A', 1, 441
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-11-B', 1, 442
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-12-A', 1, 443
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-12-B', 1, 444
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-13-A', 1, 445
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-13-B', 1, 446
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-14-A', 1, 447
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-14-B', 1, 448
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-15-A', 1, 449
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-15-B', 1, 450
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-16-A', 1, 451
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-16-B', 1, 452
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-18-A', 1, 453
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-18-B', 1, 454
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-19-A', 1, 455
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'M-19-B', 1, 456
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'M'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'M-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'N', 14
FROM gudang g
WHERE g.kode = 'G20'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'N'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-1-A', 1, 457
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-1-B', 1, 458
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-2-A', 1, 459
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-2-B', 1, 460
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-3-A', 1, 461
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-3-B', 1, 462
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-4-A', 1, 463
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-4-B', 1, 464
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-5-A', 1, 465
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-5-B', 1, 466
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-6-A', 1, 467
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-6-B', 1, 468
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-7-A', 1, 469
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-7-B', 1, 470
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-8-A', 1, 471
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-8-B', 1, 472
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-10-A', 1, 473
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-10-B', 1, 474
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-11-A', 1, 475
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-11-B', 1, 476
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-12-A', 1, 477
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-12-B', 1, 478
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-13-A', 1, 479
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-13-B', 1, 480
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-14-A', 1, 481
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-14-B', 1, 482
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-15-A', 1, 483
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-15-B', 1, 484
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-16-A', 1, 485
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-16-B', 1, 486
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-18-A', 1, 487
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-18-B', 1, 488
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-19-A', 1, 489
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'N-19-B', 1, 490
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'N'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'N-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'O', 15
FROM gudang g
WHERE g.kode = 'G20'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'O'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-1-A', 1, 491
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-1-B', 1, 492
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-2-A', 1, 493
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-2-B', 1, 494
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-3-A', 1, 495
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-3-B', 1, 496
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-4-A', 1, 497
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-4-B', 1, 498
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-5-A', 1, 499
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-5-B', 1, 500
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-6-A', 1, 501
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-6-B', 1, 502
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-7-A', 1, 503
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-7-B', 1, 504
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-8-A', 1, 505
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-8-B', 1, 506
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-10-A', 1, 507
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-10-B', 1, 508
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-11-A', 1, 509
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-11-B', 1, 510
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-12-A', 1, 511
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-12-B', 1, 512
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-13-A', 1, 513
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-13-B', 1, 514
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-14-A', 1, 515
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-14-B', 1, 516
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-15-A', 1, 517
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-15-B', 1, 518
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-16-A', 1, 519
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-16-B', 1, 520
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-18-A', 1, 521
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-18-B', 1, 522
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-19-A', 1, 523
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'O-19-B', 1, 524
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'O'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'O-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'P', 16
FROM gudang g
WHERE g.kode = 'G20'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'P'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-1-A', 1, 525
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-1-B', 1, 526
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-2-A', 1, 527
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-2-B', 1, 528
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-3-A', 1, 529
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-3-B', 1, 530
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-4-A', 1, 531
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-4-B', 1, 532
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-5-A', 1, 533
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-5-B', 1, 534
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-6-A', 1, 535
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-6-B', 1, 536
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-7-A', 1, 537
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-7-B', 1, 538
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-8-A', 1, 539
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-8-B', 1, 540
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-9-A', 1, 541
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-9-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-9-B', 1, 542
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-9-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-10-A', 1, 543
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-10-B', 1, 544
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-11-A', 1, 545
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-11-B', 1, 546
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-12-A', 1, 547
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-12-B', 1, 548
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-13-A', 1, 549
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-13-B', 1, 550
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-14-A', 1, 551
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-14-B', 1, 552
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-15-A', 1, 553
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-15-B', 1, 554
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-16-A', 1, 555
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-16-B', 1, 556
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-18-A', 1, 557
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-18-B', 1, 558
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-19-A', 1, 559
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'P-19-B', 1, 560
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G20' AND l.nama = 'P'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'P-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'Q', 17
FROM gudang g
WHERE g.kode = 'G21'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'Q'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-6-A', 1, 561
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-6-B', 1, 562
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-7-A', 1, 563
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-7-B', 1, 564
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-8-A', 1, 565
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-8-B', 1, 566
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-9-A', 1, 567
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-9-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-9-B', 1, 568
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-9-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-10-A', 1, 569
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-10-B', 1, 570
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-11-A', 1, 571
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-11-B', 1, 572
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-12-A', 1, 573
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-12-B', 1, 574
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-13-A', 1, 575
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-13-B', 1, 576
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-14-A', 1, 577
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-14-B', 1, 578
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-15-A', 1, 579
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-15-B', 1, 580
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-16-A', 1, 581
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-16-B', 1, 582
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-18-A', 1, 583
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-18-B', 1, 584
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-19-A', 1, 585
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'Q-19-B', 1, 586
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'Q'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'Q-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'R', 18
FROM gudang g
WHERE g.kode = 'G21'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'R'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-7-A', 1, 587
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-7-B', 1, 588
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-8-A', 1, 589
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-8-B', 1, 590
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-9-A', 1, 591
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-9-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-9-B', 1, 592
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-9-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-10-A', 1, 593
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-10-B', 1, 594
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-11-A', 1, 595
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-11-B', 1, 596
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-12-A', 1, 597
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-12-B', 1, 598
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-13-A', 1, 599
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-13-B', 1, 600
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-14-A', 1, 601
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-14-B', 1, 602
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-15-A', 1, 603
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-15-B', 1, 604
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-16-A', 1, 605
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-16-B', 1, 606
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-18-A', 1, 607
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-18-B', 1, 608
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-19-A', 1, 609
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'R-19-B', 1, 610
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'R'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'R-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'S', 19
FROM gudang g
WHERE g.kode = 'G21'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'S'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-7-A', 1, 611
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-7-B', 1, 612
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-8-A', 1, 613
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-8-B', 1, 614
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-9-A', 1, 615
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-9-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-9-B', 1, 616
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-9-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-10-A', 1, 617
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-10-B', 1, 618
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-11-A', 1, 619
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-11-B', 1, 620
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-12-A', 1, 621
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-12-B', 1, 622
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-13-A', 1, 623
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-13-B', 1, 624
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-14-A', 1, 625
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-14-B', 1, 626
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-15-A', 1, 627
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-15-B', 1, 628
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-16-A', 1, 629
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-16-B', 1, 630
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-18-A', 1, 631
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-18-B', 1, 632
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-19-A', 1, 633
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'S-19-B', 1, 634
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'S'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'S-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'T', 20
FROM gudang g
WHERE g.kode = 'G21'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'T'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-7-A', 1, 635
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-7-B', 1, 636
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-8-A', 1, 637
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-8-B', 1, 638
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-9-A', 1, 639
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-9-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-9-B', 1, 640
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-9-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-10-A', 1, 641
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-10-B', 1, 642
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-11-A', 1, 643
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-11-B', 1, 644
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-12-A', 1, 645
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-12-B', 1, 646
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-13-A', 1, 647
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-13-B', 1, 648
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-14-A', 1, 649
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-14-B', 1, 650
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-15-A', 1, 651
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-15-B', 1, 652
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-16-A', 1, 653
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-16-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-16-B', 1, 654
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-16-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-18-A', 1, 655
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-18-B', 1, 656
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-19-A', 1, 657
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'T-19-B', 1, 658
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'T'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'T-19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'V', 21
FROM gudang g
WHERE g.kode = 'G21'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'V'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'V', 1, 659
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'V'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'V'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'U', 22
FROM gudang g
WHERE g.kode = 'G21'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'U'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'U', 1, 660
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G21' AND l.nama = 'U'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'U'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'Kiri', 23
FROM gudang g
WHERE g.kode = 'G22'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'Kiri'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-1-A', 1, 661
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-1-B', 1, 662
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-2-A', 1, 663
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-2-B', 1, 664
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-3-A', 1, 665
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-3-B', 1, 666
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-4-A', 1, 667
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-4-B', 1, 668
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-5-A', 1, 669
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-5-B', 1, 670
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-6-A', 1, 671
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-6-B', 1, 672
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-7-A', 1, 673
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-7-B', 1, 674
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-8-A', 1, 675
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-8-B', 1, 676
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-9-A', 1, 677
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-9-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-9-B', 1, 678
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-9-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-10-A', 1, 679
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-10-B', 1, 680
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-11-A', 1, 681
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-11-B', 1, 682
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-12-A', 1, 683
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-12-B', 1, 684
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-13-A', 1, 685
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-13-B', 1, 686
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-14-A', 1, 687
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-14-B', 1, 688
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-15-A', 1, 689
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-15-B', 1, 690
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kiri-16-A', 1, 691
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kiri-16-A'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'Tengah kiri', 24
FROM gudang g
WHERE g.kode = 'G22'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'Tengah kiri'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-1-A', 1, 692
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-1-B', 1, 693
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-2-A', 1, 694
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-2-B', 1, 695
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-3-A', 1, 696
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-3-B', 1, 697
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-4-A', 1, 698
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-4-B', 1, 699
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-5-A', 1, 700
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-5-B', 1, 701
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-6-A', 1, 702
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-6-B', 1, 703
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-7-A', 1, 704
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-7-B', 1, 705
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-8-A', 1, 706
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-8-B', 1, 707
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-10-A', 1, 708
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-10-B', 1, 709
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-11-A', 1, 710
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-11-B', 1, 711
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-12-A', 1, 712
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-12-B', 1, 713
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-13-A', 1, 714
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-13-B', 1, 715
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-14-A', 1, 716
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-14-B', 1, 717
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-15-A', 1, 718
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-15-B', 1, 719
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kiri-16-A', 1, 720
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kiri'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kiri-16-A'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'Tengah kanan', 25
FROM gudang g
WHERE g.kode = 'G22'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'Tengah kanan'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-1-A', 1, 721
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-1-B', 1, 722
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-2-A', 1, 723
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-2-B', 1, 724
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-3-A', 1, 725
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-3-B', 1, 726
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-4-A', 1, 727
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-4-B', 1, 728
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-5-A', 1, 729
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-5-B', 1, 730
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-6-A', 1, 731
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-6-B', 1, 732
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-7-A', 1, 733
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-7-B', 1, 734
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-8-A', 1, 735
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-8-B', 1, 736
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-10-A', 1, 737
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-10-B', 1, 738
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-11-A', 1, 739
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-11-B', 1, 740
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-12-A', 1, 741
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-12-B', 1, 742
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-13-A', 1, 743
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-13-B', 1, 744
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-14-A', 1, 745
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-14-B', 1, 746
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-15-A', 1, 747
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-15-B', 1, 748
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'tengah-kanan-16-A', 1, 749
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Tengah kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'tengah-kanan-16-A'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, 'Kanan', 26
FROM gudang g
WHERE g.kode = 'G22'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = 'Kanan'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-1-A', 1, 750
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-1-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-1-B', 1, 751
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-1-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-2-A', 1, 752
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-2-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-2-B', 1, 753
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-2-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-3-A', 1, 754
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-3-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-3-B', 1, 755
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-3-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-4-A', 1, 756
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-4-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-4-B', 1, 757
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-4-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-5-A', 1, 758
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-5-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-5-B', 1, 759
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-5-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-6-A', 1, 760
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-6-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-6-B', 1, 761
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-6-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-7-A', 1, 762
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-7-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-7-B', 1, 763
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-7-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-8-A', 1, 764
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-8-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-8-B', 1, 765
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-8-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-9-A', 1, 766
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-9-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-9-B', 1, 767
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-9-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-10-A', 1, 768
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-10-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-10-B', 1, 769
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-10-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-11-A', 1, 770
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-11-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-11-B', 1, 771
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-11-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-12-A', 1, 772
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-12-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-12-B', 1, 773
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-12-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-13-A', 1, 774
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-13-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-13-B', 1, 775
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-13-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-14-A', 1, 776
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-14-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-14-B', 1, 777
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-14-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-15-A', 1, 778
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-15-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-15-B', 1, 779
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-15-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, 'kanan-16-A', 1, 780
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = 'Kanan'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = 'kanan-16-A'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, '20-A', 27
FROM gudang g
WHERE g.kode = 'G22'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = '20-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, '20-A', 1, 781
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = '20-A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = '20-A'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, '19-B', 28
FROM gudang g
WHERE g.kode = 'G22'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = '19-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, '19-B', 1, 782
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = '19-B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = '19-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, '19-A', 29
FROM gudang g
WHERE g.kode = 'G22'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = '19-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, '19-A', 1, 783
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = '19-A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = '19-A'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, '18-B', 30
FROM gudang g
WHERE g.kode = 'G22'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = '18-B'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, '18-B', 1, 784
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = '18-B'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = '18-B'
  );

INSERT INTO lokasi (gudang_id, nama, urutan)
SELECT g.id, '18-A', 31
FROM gudang g
WHERE g.kode = 'G22'
  AND NOT EXISTS (
    SELECT 1 FROM lokasi l WHERE l.gudang_id = g.id AND l.nama = '18-A'
  );

INSERT INTO tags (lokasi_id, nomor, weight, urutan)
SELECT l.id, '18-A', 1, 785
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE g.kode = 'G22' AND l.nama = '18-A'
  AND NOT EXISTS (
    SELECT 1 FROM tags t WHERE t.lokasi_id = l.id AND t.nomor = '18-A'
  );

UPDATE lokasi SET retired_at = now()
WHERE nama IN ('Lokasi I', 'Lokasi II', 'Lokasi III')
  AND retired_at IS NULL;
