# Stage 3: Data Model, Field Spec, API Contract

**System:** stock-opname
**Stage:** 3 of 12
**Revision:** 3 (October 2026). Aligned to PRD rev 10. Changes in this revision: `tags.is_active` became `retired_at`, `session_tags` is now part of the model (full treatment in `03b-master-data-denah.md`), and the endpoints for Daftar Barang, Peta Barang and denah master data are specified.
**Mode:** teaching. Backend and schema design are the stated growth area, so this explains the reasoning, not just the result.

---

## 0. How to read this

Sections 1 and 2 are the two ideas everything else follows from. Section 8 is where the two reports come from, with the SQL. Section 9 is the offline sync contract. Section 11 is identity. Section 12 is the security review you did not ask for, and one item in it is a real vulnerability in the Excel export that most people ship by accident.

---

## 1. The one idea: store facts, derive status

The common way a schema like this rots is a `status` column somebody has to remember to update.

```
tags
  id
  nomor
  status        ← "selesai" / "proses" / "selisih"
```

It fails because status becomes a **second copy of the truth**. Every path that inserts a count must also update the status, and the day one path forgets, the denah shows green for a tag nobody counted. Nothing in the data says which copy is right.

Store only what happened, as events, and compute status when you need it:

| Store (fact) | Derive (status) |
|---|---|
| "Budi counted 12 pcs of item 1234 on tag 1.1, pass 1, at 09:14" | "Tag 1.1 is waiting for pass 2" |
| "Budi declared tag 1.1 complete for pass 1 at 09:30" | "Lokasi I is 7 of 9 done" |
| "Sari declared tag 1.1 complete for pass 2 at 11:02" | "Tag 1.1 has a selisih hitung" |

Facts are append only. Never updated, never deleted. Status is a query.

**Why this is right here specifically:**

- Offline sync becomes trivial. Two devices inserting rows cannot conflict. Two devices updating the same status column absolutely can.
- It is the audit trail, for free. Not a separate log that can disagree with the data, but the data itself.
- A correction is a new row, so what someone thought at 10am survives.

**The cost, stated honestly:** every status read is a query over counts rather than a column lookup. At roughly 50,000 count rows Postgres answers in milliseconds. At ten million rows a night you would add a materialised view. You do not have that problem.

---

## 2. The second idea: grain

Before writing a table, answer one question: **what does one row mean?** Most schema bugs are a grain that was never stated.

| Table | One row means |
|---|---|
| `snapshot_items` | One item, in one gudang, in one session, as the system believed it at cutoff |
| `session_tags` | One tag, as it was laid out when this session opened |
| `counts` | One person said: this item, this quantity, this condition, on this tag, in this pass, at this moment |
| `tag_submissions` | One person declared one tag finished for one pass |
| `tag_assignments` | One person is responsible for one tag in one pass |
| `user_devices` | One phone belongs to one counter for one session |

`counts` has **no notion of "the current count"**. There is no current row, only the most recent one.

---

## 3. Tables, part one: identity and structure

### `users`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `nama` | text | Shown on reports, so it is the real name |
| `username` | text unique null | Only for admin and reviewer |
| `password_hash` | text **null** | **Null for every counter.** See Section 11 |
| `role` | enum | `admin`, `reviewer`, `counter` |
| `retired_at` | timestamptz null | Retired after the session closes, never deleted, because count rows reference them forever |

`password_hash` being nullable is a deliberate schema statement, not an oversight: a counter account that can authenticate with a secret does not exist in this system.

### `gudang`, `lokasi`, `tags` — master data

Three explicit tables rather than one self referencing tree.

**Why explicit beats generic here.** A self referencing tree is right when depth is unknown or changes. Yours is fixed at three levels. The generic version buys flexibility you will never use, costs a recursive query for "all tags in a gudang", and leaves open the possibility of a tag parented directly to a gudang. Three tables make the illegal state unrepresentable.

```
gudang
  id uuid pk
  kode text unique          -- "G01"
  nama text                 -- matches Nama_Gudang in the export, exactly
  urutan int
  retired_at timestamptz null

lokasi
  id uuid pk
  gudang_id uuid fk → gudang
  nama text                 -- "Lokasi I"
  urutan int                -- left to right in the denah
  retired_at timestamptz null
  UNIQUE (gudang_id, nama)

tags
  id uuid pk
  lokasi_id uuid fk → lokasi
  nomor text                -- "1.1"
  weight int default 1      -- flex-grow in the denah
  urutan int                -- top to bottom
  retired_at timestamptz null
  UNIQUE (lokasi_id, nomor)
```

**These three tables are master data, not session data.** They persist between opnames, which is what makes the denah a foundation for next year rather than something re-entered annually. See `03b-master-data-denah.md` for the lifecycle rules.

`gudang.nama` must match `Nama_Gudang` exactly, because that string is the join key at import. If they drift, stock is assigned to no gudang. The import refuses unknown names rather than skipping them (Section 12).

**On `retired_at` rather than DELETE.** Once a tag has count rows, deleting it either breaks the foreign key or cascades away evidence. Retire, never delete. A timestamp beats a boolean because it also answers *when*, at no extra cost. Same rule for users, lokasi and gudang.

### `session_tags` — the per session pin

```
session_tags
  session_id uuid fk
  tag_id uuid fk
  nomor text                -- copied at open
  lokasi_nama text          -- copied at open
  gudang_nama text          -- copied at open
  weight int
  urutan int
  PRIMARY KEY (session_id, tag_id)
```

Written once when a session moves `draft → open`, then never updated.

**Why this exists.** Master data changes. Next year "Lokasi III" is split in two and tag 3.4 is renamed. Without a pin, last year's signed report would re-render with this year's names, and a historical document that changes is not a record. Copying four fields at open costs nothing and keeps old reports readable forever.

Every report, every export and every denah render for a session reads `session_tags`, never `tags`. `tags` is only read by the denah editor and by Peta Barang. Full rules in `03b-master-data-denah.md`.

---

## 4. Tables, part two: the snapshot

### Two tables, not one

```
import_rows          ← raw, exactly as uploaded, every column text
snapshot_items       ← cleaned, typed, filtered, aggregated
```

**Why keep the raw landing table.** In three months somebody asks why item 1234 shows a variance of 40. You answer from the file that was uploaded, not from your interpretation of it. If the import transformed and discarded, the honest answer is "I do not know", and that loses the argument.

### `import_rows`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `session_id` | uuid fk | |
| `row_number` | int | Line in the source file, for error messages |
| `raw` | jsonb | The whole row, every column, as text, untouched |
| `created_at` | timestamptz | |

Everything as text, nothing coerced. Coercion is where data quietly changes shape: `0123` becomes `123`, and that item never matches again.

### `snapshot_items`

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | uuid pk | | |
| `session_id` | uuid fk | | |
| `gudang_id` | uuid fk | `Nama_Gudang` → lookup | Refuses on unknown name |
| `kode_barang` | text | `Kode_Barang` | |
| `barcode_4` | text | the 4 digit code | Text, never int, or `0123` loses its zero |
| `nama_barang` | text | `Nama_Barang` | Downloaded to the phone. Load bearing |
| `kode_brand`, `nama_brand` | text | | Scope filter and device search |
| `kode_group`, `nama_group` | text | | |
| `uom` | text null | not in export yet | |
| `qty_onhand` | numeric(18,4) | `Qty_OnHand`, **summed** | **Never sent to a phone** |
| `harga_satuan` | numeric(18,2) | `Harga_Satuan` | **Never sent to a phone.** Copied, not looked up later |
| `source_row_count` | int | | How many export rows aggregated into this one |
| | | | **UNIQUE (session_id, gudang_id, kode_barang)** |

**Why `qty_onhand` is summed.** The export carries `Tag_No`, so one item in one gudang can appear on several rows. The import aggregates:

```sql
SELECT Nama_Gudang, Kode_Barang, SUM(Qty_OnHand), MAX(Harga_Satuan), COUNT(*)
GROUP BY Nama_Gudang, Kode_Barang
```

`source_row_count` records how many rows collapsed, so a surprising number is visible rather than silent.

**Why `numeric` and never `float`.** Floating point cannot represent 0.1 exactly. Quantities and money in `float` produce totals off by fractions, and a variance report that disagrees with itself when re-sorted is never trusted again. `numeric` is exact, and the arithmetic cost is invisible at your volume.

**Why `harga_satuan` is copied.** A snapshot is a photograph. If a price change next month alters a signed opname report, the report was never a record of anything. Same rule as the fuel rate in teknisi-expense.

`Total_Harga` from the export is deliberately **not** stored. It is `qty × harga_satuan`, and a stored derived value is one more thing that can disagree with its inputs.

### `opname_sessions`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `nama` | text | "Stock Opname Tahunan 2026" |
| `periode` | text | From the export. Printed on every report |
| `snapshot_at` | timestamptz | The cutoff moment |
| `scope_filter` | jsonb | Brands and groups the coordinator ticked, so a report can state its own scope |
| `source_query` | text null | The SQL used in SSMS, pasted at import |
| `status` | enum | Section 7 |
| `created_by`, `created_at` | | |

Scope lives on the session, not in config, because next year's brand list will differ and that must not be a code change. A year from now, "which brands were in this count" has to be answerable from the database rather than from memory.

---

## 5. Tables, part three: counting

### `tag_assignments`

```
id uuid pk
session_id uuid fk
tag_id uuid fk
pass smallint              -- 1, 2, 3
user_id uuid fk
assigned_at timestamptz
UNIQUE (session_id, tag_id, pass)
```

One person per tag per pass. That uniqueness is what makes the clock reasoning in Section 9 valid.

**Pass 2 must not be the same person as pass 1.** Enforced in the application at assignment time, and again at submission time. Two checks for one rule is not redundancy; it is the difference between a rule and a suggestion.

### `counts`

The heart of the system.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `client_row_id` | uuid **unique** | Generated on the phone. The idempotency key, Section 9 |
| `session_id` | uuid fk | |
| `tag_id` | uuid fk | |
| `pass` | smallint | 1, 2, 3 |
| `snapshot_item_id` | uuid fk | |
| `counted_by` | uuid fk → users | |
| `qty` | numeric(18,4) | |
| `qty_note` | text **null** | **The calculator expression**, e.g. `12 × 24 + 6` |
| `kondisi` | enum | `baik`, `rusak`, `kadaluarsa` |
| `device_id` | text | Which phone. **Load bearing, see Section 11** |
| `client_created_at` | timestamptz | When the phone recorded it. **Ordering key** |
| `server_created_at` | timestamptz default now() | When the server received it |

**No `is_current`, no `superseded_by`, no `deleted_at`.** All three are updates, and updates are what this design exists to avoid. The current value for a key is the most recent row:

```sql
SELECT DISTINCT ON (tag_id, pass, snapshot_item_id, kondisi)
       tag_id, pass, snapshot_item_id, kondisi, qty, qty_note
FROM counts
WHERE session_id = $1
ORDER BY tag_id, pass, snapshot_item_id, kondisi, client_created_at DESC
```

`DISTINCT ON` is Postgres specific and the cleanest way to say "latest row per group".

**On `qty_note`.** One nullable column, written only when the counter used the calculator. In three months it is the difference between "294, we do not know why" and an answer. It is a note, never a source of truth: `qty` is the number, `qty_note` explains it.

**UI consequence:** within one tag and pass, each (item, kondisi) has exactly one current quantity. Re-entering the same item **replaces** the quantity rather than adding. The Ganti / Tambahkan prompt in the flow document exists because counters think in increments; it computes the sum on the device and submits the new total. The counter's **Ubah** button is the same mechanism: a new row, not an update.

### `tag_submissions`

```
id uuid pk
client_row_id uuid unique
session_id uuid fk
tag_id uuid fk
pass smallint
submitted_by uuid fk
is_empty boolean           -- true = "I looked, there is nothing here"
device_id text             -- the device pair rule reads this
client_created_at timestamptz
server_created_at timestamptz
```

**Why this is a fact and not derived.** A tag with no count rows is ambiguous: empty, or untouched? Only a person can say, and that statement is worth storing. This table is what makes "zero tags unaccounted for" a provable claim rather than a hope.

### `unknown_items`

```
id uuid pk
client_row_id uuid unique
session_id, tag_id, pass, counted_by, device_id
kode_input text            -- whatever they typed
nama_input text            -- whatever they wrote
qty numeric(18,4)
kondisi enum
client_created_at, server_created_at
```

**Why a separate table rather than a nullable `snapshot_item_id` on `counts`.** A nullable foreign key means every variance query needs `WHERE snapshot_item_id IS NOT NULL`, and the day one query forgets, unknown items silently contaminate the reconciliation. Separating them makes that impossible rather than merely unlikely. One extra table is the right trade when the failure is silent.

### `user_devices` — the binding record

This table replaced the password.

```
session_id uuid fk
device_id text             -- generated on first load, kept in IndexedDB
user_id uuid fk
bound_at timestamptz
bound_by uuid fk → users   -- the coordinator who supervised the briefing
released_at timestamptz null
last_sync_at timestamptz
last_reported_pending int
PRIMARY KEY (session_id, device_id)
```

Primary key `(session_id, device_id)` says the thing that matters: **one phone is one counter for one session**. A partial unique index on `(session_id, user_id) WHERE released_at IS NULL` says the converse, one counter has one live phone.

### `approvals`

```
id uuid pk
session_id uuid fk
step smallint              -- 1 = reviewer, 2 = accounting
approved_by uuid fk
approved_at timestamptz
catatan text
UNIQUE (session_id, step)
```

---

## 6. Field spec summary

Thirteen tables.

| Group | Tables |
|---|---|
| Master data, survives sessions | `gudang`, `lokasi`, `tags`, `users` |
| Per session pin | `session_tags` |
| Snapshot | `import_rows`, `snapshot_items` |
| Counting facts, append only | `counts`, `tag_submissions`, `unknown_items` |
| Process | `opname_sessions`, `tag_assignments`, `user_devices`, `approvals` |

**Every table recording a human action carries `client_row_id`, `device_id`, `client_created_at` and `server_created_at`.** Treat that quartet as one unit. It makes offline sync safe, and it is what lets you reconstruct events when someone disputes a number.

---

## 7. The state machine

### Session

```
draft ──► open ──► counting ──► review ──► approved ──► closed
                      │            ▲
                      └────────────┘
                     (reopened by admin, recorded)
```

| Transition | Guard |
|---|---|
| `draft → open` | Snapshot imported, denah defined, tags printed, every counter's phone bound. **Writes `session_tags`** |
| `open → counting` | At least one assignment exists |
| `counting → review` | **Every tag has a submission for pass 1 and pass 2, and zero unresolved selisih hitung** |
| `review → approved` | Both approval steps recorded |
| `approved → closed` | Exports generated |

The `counting → review` guard is the mechanical form of the rule in the PRD: counting errors are resolved in the field, before real variance is ever reported.

### Tag status, derived not stored

| Condition | Status |
|---|---|
| No submission for pass 1 | `belum` |
| Pass 1 submitted, no pass 2 | `menunggu_hitung_2` |
| Both submitted, quantities differ on any item | `selisih_hitung` |
| `selisih_hitung` plus a pass 3 submission | `selesai` |
| Both submitted, all quantities agree | `selesai` |
| `is_empty = true` for both passes | `kosong` |

---

## 8. Where the two reports come from

The part worth reading twice.

### Step 1: current counts

```sql
CREATE VIEW v_current_counts AS
SELECT DISTINCT ON (tag_id, pass, snapshot_item_id, kondisi)
       session_id, tag_id, pass, snapshot_item_id, kondisi, qty, counted_by
FROM counts
ORDER BY tag_id, pass, snapshot_item_id, kondisi, client_created_at DESC;
```

### Step 2: quantity per tag, per item, per pass

```sql
CREATE VIEW v_tag_item_pass AS
SELECT session_id, tag_id, snapshot_item_id, pass, SUM(qty) AS qty
FROM v_current_counts
GROUP BY session_id, tag_id, snapshot_item_id, pass;
```

**Why kondisi is summed away before comparing passes.** If counter A records 10 baik and counter B records 8 baik plus 2 rusak, the quantity agrees and only the damage judgement differs. Blocking the session on that would stall the count over opinions about scratched tins.

The rule: **block on objective disagreements, report subjective ones.**

### Step 3: the pass comparison, and Selisih Hitung

```sql
CREATE VIEW v_tag_item AS
SELECT
  session_id, tag_id, snapshot_item_id,
  MAX(qty) FILTER (WHERE pass = 1) AS qty_1,
  MAX(qty) FILTER (WHERE pass = 2) AS qty_2,
  MAX(qty) FILTER (WHERE pass = 3) AS qty_3
FROM v_tag_item_pass
GROUP BY session_id, tag_id, snapshot_item_id;
```

```sql
-- SELISIH HITUNG: resolve in the field, before anything else
SELECT * FROM v_tag_item
WHERE qty_3 IS NULL
  AND COALESCE(qty_1, 0) <> COALESCE(qty_2, 0);
```

`COALESCE(..., 0)` is doing real work. If counter A found an item and counter B recorded nothing, `qty_2` is NULL and `NULL <> 5` evaluates to NULL, so the row would vanish. That case, one counter seeing something the other missed, is exactly the disagreement you most want to catch.

**This same condition drives the conditional display** in the PRD: the comparison panel appears when it is true and is hidden when it is false. Never write it as `qty_1 <> qty_2`.

### Step 4: agreed quantity

```sql
CREATE VIEW v_agreed AS
SELECT session_id, tag_id, snapshot_item_id,
       COALESCE(qty_3,
                CASE WHEN COALESCE(qty_1,0) = COALESCE(qty_2,0)
                     THEN COALESCE(qty_1,0) END) AS qty_agreed
FROM v_tag_item;
```

A third count always wins. Otherwise the two passes must agree, and if they do not, `qty_agreed` is NULL and the session cannot reach review.

### Step 5: Selisih Sistem

```sql
SELECT
  si.gudang_id, si.kode_barang, si.nama_barang, si.qty_onhand,
  COALESCE(SUM(a.qty_agreed), 0)                 AS qty_hitung,
  COALESCE(SUM(a.qty_agreed), 0) - si.qty_onhand AS selisih_qty,
  (COALESCE(SUM(a.qty_agreed), 0) - si.qty_onhand) * si.harga_satuan AS selisih_nilai
FROM snapshot_items si
LEFT JOIN v_agreed a ON a.snapshot_item_id = si.id
WHERE si.session_id = $1
GROUP BY si.id;
```

**The `LEFT JOIN` is the most important word in this document.**

An `INNER JOIN` is the natural thing to write, and it silently drops every item no counter recorded. Those rows are `qty_hitung = 0` against a system quantity of 40, which is the largest and most serious finding a stock opname can produce. An inner join hides exactly the rows that matter most, and the report still looks complete.

Your zero found report is this query filtered to `qty_hitung = 0 AND qty_onhand > 0`.

### Step 6: Peta Barang, where an item physically was

```sql
SELECT st.gudang_nama, st.lokasi_nama, st.nomor, SUM(a.qty_agreed) AS qty
FROM v_agreed a
JOIN session_tags st ON st.session_id = a.session_id AND st.tag_id = a.tag_id
JOIN snapshot_items si ON si.id = a.snapshot_item_id
WHERE a.session_id = $1 AND si.barcode_4 = $2
GROUP BY st.gudang_nama, st.lokasi_nama, st.nomor
ORDER BY st.gudang_nama, st.lokasi_nama, st.nomor;
```

This is the payoff from `session_tags`. It answers "which lokasi and tags hold item 1234", and it reads the pinned names, so the answer stays correct even after the denah is rearranged.

### How to verify before you trust it

Build one tag with known numbers by hand:

| Setup | Expected |
|---|---|
| Pass 1: 10, Pass 2: 10. System: 10 | No selisih hitung, no selisih sistem |
| Pass 1: 10, Pass 2: 10. System: 8 | No selisih hitung. Selisih sistem +2 |
| Pass 1: 10, Pass 2: 9 | Selisih hitung present. Item absent from selisih sistem |
| Pass 1: 10, Pass 2: 9, Pass 3: 10. System: 10 | Resolved, selisih sistem 0 |
| Pass 1: 10, Pass 2: nothing entered | Selisih hitung present. **The COALESCE case** |
| No counts at all. System: 40 | Selisih sistem −40, appears in zero found. **The LEFT JOIN case** |
| Pass 1: 8 baik + 2 rusak, Pass 2: 10 baik | No selisih hitung. Kondisi report shows the split |

Rows 5 and 6 are the two bugs that ship silently.

---

## 9. The offline sync contract

### The problem

A phone holds a queue. It uploads. The connection drops mid request. The phone cannot know whether the server got it, so it retries. Without protection the quantities double, and a doubled count is indistinguishable from real surplus.

### The solution: idempotency key

The **device** generates a `client_row_id` (UUID v4) when the counter presses save, before any network involvement.

```sql
INSERT INTO counts (client_row_id, session_id, tag_id, ...)
VALUES ($1, $2, $3, ...)
ON CONFLICT (client_row_id) DO NOTHING;
```

Retry as often as you like. The queue can be flushed repeatedly with no consequence, so the phone never has to reason about whether a request succeeded.

**Verify:** post the same batch twice. `SELECT COUNT(*) FROM counts` is unchanged and the response is success both times.

**If you skip it:** counts exactly double or triple on precisely the tags where signal was worst. It looks like a counting problem and is not, which is why it costs days to find.

### Why clock skew is not a problem

Ordering uses `client_created_at`, from a phone whose clock may be wrong by hours. It does not matter, because `tag_assignments` is unique on (tag, pass) and one counter has one bound device. Every row sharing an ordering key therefore comes from a single phone, and a phone's clock is internally consistent even when absolutely wrong.

`server_created_at` is kept for forensics and as a tiebreaker, not for ordering.

Worth noticing as a pattern: a constraint elsewhere in the model removed an entire class of distributed systems problem. That is usually cheaper than solving the problem.

---

## 10. API contract

All endpoints under `/api`. Session cookie auth, httpOnly, sameSite lax.

### Binding, the one time identity step

```
GET  /api/sessions/:id/counters     → [{ user_id, nama, already_bound }]
POST /api/sessions/:id/bind         { user_id, device_id }
```

`counters` lists only counters assigned to this session, with `already_bound` so the picker can grey them out. `bind` refuses when that user already has a live binding, and returns which device holds it plus its last reported pending count.

There is no `/login` for counters. There is no password field anywhere in the counting app.

### Preparation, the offline payload

```
GET /api/sessions/:id/prepare
```

```jsonc
{
  "session":  { "id", "nama", "periode", "status" },
  "counter":  { "id", "nama" },
  "scope":    { "brands": ["Asia", "..."], "groups": ["Material"] },
  "items": [
    { "id", "kode_barang", "barcode_4", "nama_barang",
      "nama_brand", "nama_group", "uom" }
    // NO qty_onhand. NO harga_satuan. NO Total_Harga.
  ],
  "denah":  [ { "lokasi": "...", "tags": [ { "id", "nomor", "weight" } ] } ],
  "assignments": [ { "tag_id", "pass" } ]
}
```

One call fills all five preparation ticks. `scope` is echoed so the phone can display what it is counting, and `items` is already filtered by it. `denah` is read from `session_tags`, so a counter's offline copy matches the printed cards even if master data changes mid session.

Cari Barang needs no endpoint: it searches the `items` array already on the device, which is what makes it work offline.

**The omission is the security control.** `qty_onhand` and `harga_satuan` are absent from this response, not hidden by the client. Anything in the JSON is readable by anyone who opens devtools or inspects the service worker cache, and a blind count that can be un-blinded by curiosity is not a blind count.

### Sync

```
POST /api/counts/sync
```

```jsonc
{
  "device_id": "...",
  "pending_after": 0,
  "counts":      [ { "client_row_id", "tag_id", "pass", "snapshot_item_id",
                     "qty", "qty_note", "kondisi", "client_created_at" } ],
  "submissions": [ { "client_row_id", "tag_id", "pass", "is_empty",
                     "client_created_at" } ],
  "unknowns":    [ { "client_row_id", "tag_id", "pass", "kode_input",
                     "nama_input", "qty", "kondisi", "client_created_at" } ]
}
```

```jsonc
{ "accepted": ["uuid", "..."], "rejected": [ { "client_row_id", "reason" } ] }
```

The device deletes from its queue only the ids in `accepted`. Rejected ids stay, with the reason shown to the counter.

**Server side checks on every row, none of them trusting the client:**

| Check | Why |
|---|---|
| `device_id` has a live binding in this session | This replaces authentication |
| Session status is `counting` **or `review`** | Upload must stay open after counting closes. Everything else about a closed session is immutable at the API, not just in the UI |
| The tag is assigned to the bound user for this pass | A counter must not submit for someone else's tag |
| For pass 2, the bound user is not the pass 1 counter | Defence in depth |
| **For pass 2, `device_id` ≠ the device on the accepted pass 1 submission for that tag** | **Section 11. The check that survives a weak sign in** |
| `snapshot_item_id` belongs to this session | Stops a stale cached id from a previous session landing in this one |
| `tag_id` exists in `session_tags` for this session | Stops a tag added to master data mid session from receiving counts |
| `qty >= 0` | |

### Master data

```
GET    /api/gudang                              admin
POST   /api/gudang                              admin
GET    /api/gudang/:id/denah                    admin    lokasi + tags, editor shape
PUT    /api/gudang/:id/denah                    admin    whole denah, one transaction
POST   /api/tags/:id/retire                     admin    sets retired_at
GET    /api/gudang/:id/tags.pdf                 admin    printable cards
GET    /api/gudang/:id/tags.pdf?new_only=1      admin    the delta after a denah edit
```

`PUT .../denah` replaces a gudang's layout in one transaction rather than firing a request per tag. The editor is a form, not a live canvas, so a single save is both simpler and safer. It refuses to retire a tag that has counts in any session.

### Reports and actions

```
POST /api/import                                admin     multipart, see Section 12
GET  /api/sessions/:id/items                    admin     Daftar Barang. Paginated, filter by gudang, brand, group, free text
GET  /api/sessions/:id/peta-barang?kode=1234    admin     Section 8 step 6
GET  /api/sessions/:id/denah                    all       derived status per tag, from session_tags
GET  /api/sessions/:id/selisih-hitung           reviewer
GET  /api/sessions/:id/selisih-sistem           reviewer
GET  /api/sessions/:id/kondisi                  reviewer
GET  /api/sessions/:id/zero-found               reviewer
GET  /api/sessions/:id/unknown-items            reviewer
GET  /api/sessions/:id/devices                  reviewer  who is on which phone, last sync, pending
POST /api/sessions/:id/devices/release          reviewer  { device_id }
POST /api/sessions/:id/transition               admin     { to: "review" }, guards in Section 7
POST /api/sessions/:id/approve                  reviewer, accounting
GET  /api/sessions/:id/export.xlsx              reviewer
GET  /api/sessions/:id/export.pdf               reviewer
```

`/items` is paginated. 5,000 rows in one response is fine for a server and wrong for a browser table.

---

## 11. Identity without credentials

Counters have no password, no PIN and no access code. They are long serving staff using this one day a year, and anything they must remember or carry is a point of failure on the only day it matters.

### How identity is established

```
At the briefing, coordinator present
   → counter taps their own name, once
   → POST /bind writes a row in user_devices
   → the phone is that counter for the whole session
```

After binding, the app never shows a picker again. Re-assignment requires the coordinator to call `/devices/release`.

### What protects the double count

Not a credential. **The device pair rule:**

> A pass 2 submission for a tag is refused when the accepted pass 1 submission for that tag carries the same `device_id`.

```sql
-- refuse when this is true
SELECT 1
FROM tag_submissions s1
WHERE s1.session_id = $session
  AND s1.tag_id     = $tag
  AND s1.pass       = 1
  AND s1.device_id  = $incoming_device_id
LIMIT 1;
```

One comparison on a column the table already has. It catches the failure that actually matters, one person counting the same tag twice, and it works no matter how light the sign in is.

**Three layers, in order:**

| | Check | Where |
|---|---|---|
| 1 | Pass 2 counter ≠ pass 1 counter | Assignment screen |
| 2 | Pass 2 counter ≠ pass 1 counter | Sync, server side |
| 3 | **Pass 2 device ≠ pass 1 device** | **Sync, server side** |

### What the system cannot do, written down

| | |
|---|---|
| Two counters deliberately swapping phones | **Not detectable.** Procedural only. The briefing states that this invalidates the count for those tags |
| Seeing inside an offline device's queue | **Not possible.** `last_reported_pending` is what the phone said at its last sync, and the UI labels it that way |
| Surviving cleared browser data | **No.** Binding lives in IndexedDB. Recovery is release plus rebind, seconds on the coordinator's screen |

A rule whose limits are written down is a rule people can work with. One that appears to guarantee more than it does is how data gets lost and how reports get over-claimed.

### The single device rule

A second binding for a user is **refused** while the first holds unsynced counts, with the message naming the count and the device. A superseded device must **still be allowed to upload** what it holds: counts belong to the session, not to the device, and revoking upload is how a shift of work disappears.

---

## 12. Security review

You did not ask for this. Four of the six matter.

### 1. Formula injection in the Excel export, a real vulnerability

If a cell value begins with `=`, `+`, `-` or `@`, Excel treats it as a formula when the file is opened. A `nama_input` of `=cmd|'/c calc'!A1` in an unknown item becomes executable content on the machine of whoever in accounting opens your report.

Your export carries free text typed on a phone, straight into a spreadsheet opened by finance. That is exactly this attack.

**Fix:** before writing any text cell, if it starts with one of those four characters, prefix a single quote. Apply to every free text column without deciding which are risky. `qty_note` counts as free text.

**Verify:** type `=1+1` as an unknown item name, export, open in Excel. You should see the literal text, not `2`.

### 2. The blind count is enforced by omission, not by hiding

`qty_onhand` and `harga_satuan` must never appear in any response a counter can call. Write a test that fetches `/prepare` as a bound counter device and asserts those keys are absent.

### 3. Authorization on every endpoint, server side

Role checks belong in the route handler, not in whether the UI renders a button. Assume every endpoint will be called directly with a crafted payload, because `fetch` in a devtools console is not an advanced attack.

**With no counter passwords, `device_id` is the only thing the counting API trusts**, so treat it accordingly: a long random value generated on the device, never guessable, stored in IndexedDB, checked against a live `user_devices` row on every request. It grants exactly one counter's assigned tags in one session, and nothing else. The approval and export endpoints sit behind real passwords and must never accept a device binding as authentication.

### 4. Upload handling at import

Accept only `.csv` and `.xlsx`. Cap the file size; 10 MB is generous for 5,000 rows. Parse into `import_rows` first and validate before writing a single `snapshot_item`, so a bad file leaves no partial state. Wrap the import in a transaction.

Validations that must refuse rather than skip:

| Condition | Why refusing beats skipping |
|---|---|
| Unknown `Nama_Gudang` | Skipping silently drops a whole warehouse from the count |
| Missing required column | Better a clear error than a snapshot with empty names |
| A `barcode_4` mapping to more than one `kode_barang` | The typo trap at its source |
| Zero rows after the scope filter | Usually means the brand names do not match reality |

Report the row count and gudang breakdown **before** committing, and require a confirmation click. A human noticing "Gudang 02: 0 items" takes two seconds and saves the count.

### 5. Password handling, for the two accounts that have one

`argon2` or `bcrypt` through a maintained library for admin and reviewer. No custom hashing. Rate limit the login endpoint. Counters are not in scope here, because they have nothing to hash.

### 6. What is not worth doing at your scale

No row level security, no field encryption, no separate audit log table, no WAF. The data is stock quantities for one annual count.

---

## 13. Indexes

Six pay for themselves. Nothing else is justified yet.

```sql
CREATE UNIQUE INDEX ON counts (client_row_id);
CREATE UNIQUE INDEX ON tag_submissions (client_row_id);
CREATE INDEX ON counts (session_id, tag_id, pass);
CREATE INDEX ON snapshot_items (session_id, barcode_4);
CREATE UNIQUE INDEX ON snapshot_items (session_id, gudang_id, kode_barang);
CREATE INDEX ON session_tags (session_id, gudang_nama, lokasi_nama, urutan);
```

Plus one that enforces a rule rather than speeding a query:

```sql
CREATE UNIQUE INDEX ON user_devices (session_id, user_id) WHERE released_at IS NULL;
```

The first two are correctness, not performance. The third serves the denah and both reports. The fourth serves item lookup and Peta Barang. The fifth prevents duplicate items in a snapshot. The sixth orders the denah render. The last is the one live phone per counter rule, enforced by the database rather than by remembering to check.

**Resist adding more.** Every index slows inserts, and your heaviest moment is fifteen phones flushing queues at the end of a shift.

---

## 14. Related documents

| Document | What it owns |
|---|---|
| `03b-master-data-denah.md` | `session_tags` lifecycle, the two immutability rules, Peta Barang, build cost |
| `04-user-flow.md` | Where each endpoint is called from, and every failure message |
| `02-prd.md` | Scope, risks, the numbers |

---

## 15. Next stage

**Stage 7: acceptance criteria, Given / When / Then.** The cases that most need writing down: the one time binding, the device pair rule, the edit boundary, the COALESCE condition, the `session_tags` pin, and the import refusals.
