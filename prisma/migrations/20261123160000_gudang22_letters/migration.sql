-- Gudang 22 racks are W X Y Z. Longer prefixes first so "kiri" does not eat "tengah-kiri".
UPDATE tags t
SET nomor = regexp_replace(t.nomor, '^tengah-kiri-', 'X-')
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE t.lokasi_id = l.id
  AND g.kode = 'G22'
  AND t.nomor LIKE 'tengah-kiri-%';

UPDATE tags t
SET nomor = regexp_replace(t.nomor, '^tengah-kanan-', 'Y-')
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE t.lokasi_id = l.id
  AND g.kode = 'G22'
  AND t.nomor LIKE 'tengah-kanan-%';

UPDATE tags t
SET nomor = regexp_replace(t.nomor, '^kiri-', 'W-')
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE t.lokasi_id = l.id
  AND g.kode = 'G22'
  AND t.nomor LIKE 'kiri-%';

UPDATE tags t
SET nomor = regexp_replace(t.nomor, '^kanan-', 'Z-')
FROM lokasi l
JOIN gudang g ON g.id = l.gudang_id
WHERE t.lokasi_id = l.id
  AND g.kode = 'G22'
  AND t.nomor LIKE 'kanan-%';

UPDATE lokasi l
SET nama = CASE l.nama
  WHEN 'Tengah kiri' THEN 'X'
  WHEN 'Tengah kanan' THEN 'Y'
  WHEN 'Kiri' THEN 'W'
  WHEN 'Kanan' THEN 'Z'
END
FROM gudang g
WHERE l.gudang_id = g.id
  AND g.kode = 'G22'
  AND l.nama IN ('Kiri', 'Tengah kiri', 'Tengah kanan', 'Kanan');

UPDATE session_tags st
SET nomor = t.nomor,
    lokasi_nama = l.nama
FROM tags t
JOIN lokasi l ON l.id = t.lokasi_id
JOIN gudang g ON g.id = l.gudang_id
WHERE st.tag_id = t.id
  AND g.kode = 'G22'
  AND l.nama IN ('W', 'X', 'Y', 'Z')
  AND (st.nomor IS DISTINCT FROM t.nomor OR st.lokasi_nama IS DISTINCT FROM l.nama);

UPDATE aisle_assignments
SET aisle = CASE aisle
  WHEN 'tengah-kiri' THEN 'X'
  WHEN 'tengah-kanan' THEN 'Y'
  WHEN 'kiri' THEN 'W'
  WHEN 'kanan' THEN 'Z'
END
WHERE gudang = 22
  AND aisle IN ('kiri', 'tengah-kiri', 'tengah-kanan', 'kanan');

UPDATE aisle_marks
SET aisle = CASE aisle
  WHEN 'tengah-kiri' THEN 'X'
  WHEN 'tengah-kanan' THEN 'Y'
  WHEN 'kiri' THEN 'W'
  WHEN 'kanan' THEN 'Z'
END
WHERE gudang = 22
  AND aisle IN ('kiri', 'tengah-kiri', 'tengah-kanan', 'kanan');
