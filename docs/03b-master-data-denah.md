# 3b. Denah as Master Data, and the Item Location Map

**System:** stock-opname
**Revision:** 2 (October 2026). `retired_at` applied to all three master tables, and Section 6 updated now that `03-data-model.md` rev 3 has absorbed the schema change.
**Extends:** `03-data-model.md`. Read that first; this adds one table and two rules.
**Why it exists:** the warehouse layout should outlive a single opname, and the count data should answer "where do we keep this item".

---

## 1. The decision

The layout is **master data with a per session pin**.

```
MASTER                     gudang · lokasi · tags
                           no session_id, persists across years,
                           retired rather than deleted

PINNED AT SESSION OPEN     session_tags
                           the layout exactly as it stood that year
```

**Reports and the denah board read `session_tags`. Never `tags`.**

### The failure this prevents

`gudang`, `lokasi` and `tags` already have no `session_id`, so carrying the layout into next year needs no new table. The risk runs the other way.

> Edit the master layout for 2027 and you silently rewrite what every 2026 count row meant.

Tag 1.3 was the corner by the door. Someone renumbers during next year's setup. The 2026 count rows still point at that `tag_id`, the printed 2026 report still says 1.3, and the system now disagrees with both. Nothing errors. The number is simply wrong in a way nobody can see.

This is the same question already answered for `harga_satuan`: a snapshot is a photograph, so store what you were given at the time. The layout deserves the same treatment as the price.

### Alternatives considered

| Option | Why not |
|---|---|
| Mutable master, no history | Last year's reports become unreadable the first time a rack moves |
| Copy the whole layout per session, as a session owned tree | Works, but then "which tags held item X across years" has to join across unrelated copies, and carrying forward means diffing two trees |
| Effective dating on every row | Correct and overbuilt. You have three warehouses and one count a year |

The pin is the cheapest thing that keeps history honest: roughly 800 rows per session, written once when the session opens.

---

## 2. Schema

### Master, with retirement on all three levels

```sql
gudang (
  id uuid pk, kode text unique, nama text, urutan int,
  retired_at timestamptz null
)

lokasi (
  id uuid pk, gudang_id uuid fk, nama text, urutan int,
  retired_at timestamptz null,
  UNIQUE (gudang_id, nama)
)

tags (
  id uuid pk, lokasi_id uuid fk, nomor text,
  weight int default 1, urutan int,
  created_at timestamptz, retired_at timestamptz null,
  UNIQUE (lokasi_id, nomor)
)
```

`retired_at` rather than a boolean, on all three, because it carries the same meaning plus *when*, at no extra cost.

### New: the pin

```sql
session_tags (
  session_id   uuid fk → opname_sessions,
  tag_id       uuid fk → tags,
  nomor        text,     -- as it stood that year
  lokasi_nama  text,     -- as it stood that year
  gudang_nama  text,     -- as it stood that year
  weight       int,
  urutan       int,
  PRIMARY KEY (session_id, tag_id)
)
```

Denormalised on purpose. The three name columns are the whole point: they are what makes a 2026 report still readable in 2029.

### Written when the session opens

```sql
INSERT INTO session_tags (session_id, tag_id, nomor, lokasi_nama, gudang_nama, weight, urutan)
SELECT $1, t.id, t.nomor, l.nama, g.nama, t.weight, t.urutan
FROM tags t
JOIN lokasi l ON l.id = t.lokasi_id
JOIN gudang g ON g.id = l.gudang_id
WHERE t.retired_at IS NULL
  AND l.retired_at IS NULL
  AND g.retired_at IS NULL;
```

One statement, part of the `open` transition.

---

## 3. The two rules that make it hold

**1. Tags are retired, never deleted.**
Once a tag has a count row, deleting it either breaks a foreign key or cascades away evidence. Set `retired_at`.

**2. `nomor` is immutable once the tag appears in any `session_tags`.**
Renumbering is retire plus create, not an `UPDATE`. A tag number is printed on a physical card, written on a report and signed by accounting. It is not a label, it is an identifier.

Enforce rule 2 in the application, and state the reason in the error, because the natural reaction to being refused is to look for a way round it:

> **Tag 1.3 tidak bisa diganti nomornya.** Nomor ini sudah dipakai pada opname 2026 dan tercetak pada laporan yang sudah disetujui. Pensiunkan tag ini lalu buat tag baru.

Before the first session, both rules are inert and the layout is freely editable. That is the window for getting it right.

---

## 4. Carrying forward

There is nothing to copy. The master **is** the carry forward.

The session open flow gains one review step:

```
Buat sesi → impor snapshot → KONFIRMASI DENAH → cetak tag → bagi tugas → buka sesi
```

The confirmation screen shows the master layout against last year's pin:

| | |
|---|---|
| Tidak berubah | 681 tag |
| Baru sejak 2026 | 14 tag → only these need printing |
| Dipensiunkan | 7 tag |

The printing delta already existed on the Cetak Tag screen. Now it has a real source rather than a guess.

---

## 5. The item location map

### The query

```sql
SELECT st.gudang_nama, st.lokasi_nama, st.nomor,
       s.periode, SUM(a.qty_agreed) AS qty
FROM   v_agreed       a
JOIN   session_tags    st ON st.session_id = a.session_id AND st.tag_id = a.tag_id
JOIN   opname_sessions s  ON s.id = a.session_id
JOIN   snapshot_items  si ON si.id = a.snapshot_item_id
WHERE  si.barcode_4 = $1
GROUP  BY st.gudang_nama, st.lokasi_nama, st.nomor, s.periode
ORDER  BY s.periode DESC;
```

No new table. No new index beyond what `03-data-model.md` already lists. Five years of counting is under 100,000 rows in `counts`, which Postgres answers without noticing.

**Read `v_agreed`, not raw `counts`.** The agreed quantity is the one that was signed off. Raw counts would show one pass, or two passes double counted, depending on how you group them. `barcode_4` is the search key because that is what the coordinator types; `kode_barang` works identically if the search comes from Daftar Barang instead.

### What it is for

| Use | Value |
|---|---|
| "Di mana kita simpan THINNER ASIA 5L?" | Answered in seconds, year round, not only at opname |
| Expected location for next year | Tags that held an item last year almost certainly hold it again |
| Investigating a variance | An item short in Gudang 02 that turns up on a Gudang 01 tag is a misplacement, not a loss |
| Groundwork for cycle counting | Counting one lokasi a week needs to know what should be there |

That last row is the real prize. It is what turns this from a tool used one day a year into a standing map of the warehouse, and it is the argument for the Level 1 SQL Server connection in the PRD.

### The restriction, and it is the blind count again

> The map shows **where**. It never shows **how many from a previous session** to anyone who is counting.

Knowing an item lived on tag 1.3 last year is harmless; the counters work there and already know. Knowing it was 240 last year would anchor whoever counts that tag today, exactly as showing the system quantity would.

| Role | Sees |
|---|---|
| Koordinator, Akunting | Location and quantity, all periods |
| Petugas hitung | Nothing. The map is not in the counting app at all |

The cleanest enforcement is the one already in use: a separate endpoint behind a role check, never present in the `/prepare` payload. Same rule as Daftar Barang.

---

## 6. What this changed elsewhere, and where it stands

| Document or screen | Change | Status |
|---|---|---|
| `03-data-model.md` | `session_tags` added, `retired_at` on all master tables, reports join through the pin | **Done, rev 3** |
| `02-prd.md` | Scope items 1, 3, 7 and the master data section | **Done, rev 10** |
| `04-user-flow.md` | A3 denah as master data, F26 denah edited during an open session | **Done, rev 2** |
| Denah editor | Moves from session setup to master data. Editable any time there is no open session, with the two rules enforced once history exists | Spec done, board 18 drawn |
| Session open | Gains the denah confirmation step and the `session_tags` insert | Spec done, **screen not drawn** |
| Cetak Tag | The "12 tag baru" delta now comes from comparing master to last pin | Spec done, board 19 drawn |
| Reports and exports | Read `session_tags.nomor`, `lokasi_nama`, `gudang_nama` rather than the live tables | Spec done |
| Peta Barang | New screen, coordinator and accounting only | Board 20b drawn, prompt C8 |

**One gap worth noting:** the denah confirmation screen at session open has a spec here and no artboard. It is a small screen and the Stage 9 build plan should carry it as its own line rather than assume it falls out of the editor.

### Build cost

| Item | Size |
|---|---|
| `session_tags` table plus the insert on open | Half a day |
| Switching reports to read the pin | Half a day, mechanical |
| Denah confirmation screen | One day |
| Peta Barang screen plus endpoint | One day |
| The two immutability rules and their messages | Half a day |

Roughly **three days**, and only the first two are needed before the first count. Peta Barang can land after, because it reads history that does not exist yet.

---

## 7. Next

The sequencing that matters: **`session_tags` must exist before the first session opens.** Adding it afterwards means reconstructing a layout that has already changed, from reports that no longer match it.
