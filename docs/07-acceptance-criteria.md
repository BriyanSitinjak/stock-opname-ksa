# Acceptance Criteria

**System:** stock-opname
**Stage:** 7 of 12
**Date:** October 2026
**Aligned to:** PRD rev 11, data model rev 3, user flow rev 2

From here these criteria are the contract. Anything not written here is a change request, not an oversight. Anyone can run these without having been part of the design conversation.

**Read AC-8 first if you only read one section.** It is where the two reports come from, and two of its criteria are the bugs that ship silently.

---

## Test fixture

Seed this exact data before running anything below. Every criterion depends on it.

**Gudang**

| kode | nama |
|---|---|
| G01 | GUDANG 01 |
| G02 | GUDANG 02 |
| G03 | GUDANG 03 |

`nama` must match `Nama_Gudang` in the import file byte for byte.

**Lokasi and tags, Gudang 01**

| lokasi | urutan | tags (nomor, weight) |
|---|---|---|
| Lokasi I | 1 | 1.1 besar (3), 1.2 sedang (2), 1.3 kecil (1) |
| Lokasi II | 2 | 2.1 besar (3), 2.2 sedang (2) |
| Lokasi III | 3 | 3.1 kecil (1) |

**Pengguna**

| nama | peran | kredensial |
|---|---|---|
| Briyan | admin | username `briyan`, password `Test1234!` |
| Dewi Lestari | reviewer (akunting) | username `dewi`, password `Test1234!` |
| Budi Santoso | counter | **none** |
| Sari Wulandari | counter | **none** |
| Agus Priyanto | counter | **none** |
| Rina Marlina | counter | **none** |

**Perangkat:** `DEV-A`, `DEV-B`, `DEV-C`, `DEV-D`. Treat these as the device ids four phones generated.

**Sesi:** `Opname Tahunan 2026`, periode `2026-12`, cut off `2026-12-15 18:00`, scope brands Asia, Platinum, Infinity, Renovo plus group Material.

**Snapshot items, Gudang 01 unless stated**

| barcode_4 | kode_barang | nama_barang | brand | qty_onhand | harga_satuan |
|---|---|---|---|---|---|
| 1234 | AS-TH-5L | THINNER ASIA 5L | Asia | 40 | 85.000 |
| 1243 | AS-TH-1L | THINNER ASIA 1L | Asia | 12 | 22.000 |
| 1180 | PL-CT-1L | CAT PLATINUM PUTIH 1L | Platinum | 10 | 120.000 |
| 9001 | IN-SL-20L | INFINITY SEALER 20L | Infinity | 38 | 410.000 |
| 7777 | SW-XX-1L | SHERWIN SAMPLE 1L | Sherwin | 25 | 95.000 |

`1234` and `1243` exist so the typo trap can be tested with two real neighbouring codes. `7777` exists so the scope filter can be proved to drop it. `9001` is the zero found case.

**Penugasan, Gudang 01**

| tag | hitung ke-1 | hitung ke-2 |
|---|---|---|
| 1.1 | Budi | Sari |
| 1.2 | Budi | Sari |
| 1.3 | Sari | Agus |
| 2.1 | Agus | Rina |
| 2.2 | Agus | Rina |
| 3.1 | Rina | Budi |

---

## AC-1. Identity, binding, and the device rule

The section with no password in it. Every criterion here replaces something a login would normally do.

**AC-1.1 No credential exists for a counter**
Given the counting app, When every screen and every request is inspected, Then no password field, PIN pad or access code field exists anywhere, and `POST /api/auth/login` returns 404 for a counter.

**AC-1.2 Binding**
Given a fresh device `DEV-A` with no binding, When Budi is tapped on the name list, Then a `user_devices` row is written with `session_id`, `device_id = DEV-A`, `user_id = Budi`, `bound_at`, and `bound_by` set to the coordinator who is signed in on the admin screen.

**AC-1.3 The picker never appears again**
Given `DEV-A` is bound to Budi, When the app is closed and reopened, Then it goes straight to Beranda and the name list is not shown.

**AC-1.4 One live phone per counter**
Given Budi is bound to `DEV-A`, When Budi is tapped on `DEV-B`, Then binding is refused, the message names `DEV-A` and its last reported pending count, and no second `user_devices` row is written.

**AC-1.5 The rule is enforced by the database, not the application**
Given Budi has a live binding, When a second row for `(session_id, Budi)` with `released_at IS NULL` is inserted directly with raw SQL, bypassing the API, Then the database rejects it on the partial unique index.

*Test this with SQL, not through the API. An application check is not what this criterion verifies.*

**AC-1.6 Release and rebind**
Given the coordinator releases `DEV-A`, When Budi is tapped on `DEV-B`, Then binding succeeds, the `DEV-A` row has `released_at` set, and the `DEV-B` row is live.

**AC-1.7 A released device can still upload**
Given `DEV-A` is released and still holds 4 queued counts, When `DEV-A` syncs, Then all 4 rows are accepted.

*If this fails, releasing a phone silently destroys a shift of counting. Counts belong to the session, never to the device.*

**AC-1.8 The device pair rule**
Given tag 1.1 pass 1 was submitted from `DEV-A`, When a pass 2 submission for tag 1.1 arrives from `DEV-A`, Then it is rejected with reason `Hitung ke-2 harus dari HP berbeda` and no row is written.

**AC-1.9 The device pair rule allows the legitimate case**
Given tag 1.1 pass 1 came from `DEV-A`, When pass 2 for tag 1.1 arrives from `DEV-B` bound to Sari, Then it is accepted.

**AC-1.10 Pass 2 by the pass 1 person is refused at assignment**
Given tag 1.1 has Budi on pass 1, When Budi is selected for pass 2 on tag 1.1, Then the assignment screen refuses it and states the reason.

**AC-1.11 And again at sync**
Given the assignment check is bypassed by writing the assignment directly with SQL, When Budi submits pass 2 for tag 1.1, Then the server refuses the row.

*Two checks for one rule is not redundancy. It is the difference between a rule and a suggestion.*

**AC-1.12 `device_id` is unguessable**
Given 100 freshly generated device ids, When they are inspected, Then each is at least 128 bits of randomness, none is sequential, and none contains a name, phone model or timestamp.

*With no counter passwords, `device_id` is the only thing the counting API trusts. A guessable one is a login with a weak password nobody can change.*

**AC-1.13 Admin and reviewer keep real passwords**
Given Dewi's account, When sign in is attempted, Then a password is required, it is verified against an argon2 or bcrypt hash, and the login endpoint is rate limited.

**AC-1.14 A device binding is not an admin credential**
Given a valid bound `device_id`, When it is presented to `/api/sessions/:id/approve`, `/export.xlsx` or any admin endpoint, Then the response is 401 or 403 and nothing changes.

---

## AC-2. The blind count, enforced by omission

These are the criteria most likely to pass in casual testing and fail in reality.

**AC-2.1 The preparation payload carries no quantity and no price**
Given a bound counter device, When `GET /api/sessions/:id/prepare` is called and the raw JSON is searched, Then the strings `qty_onhand`, `harga_satuan` and `total_harga` do not appear, and no item object contains a numeric stock or price field under any other name.

*Assert on the response body, not on the screen. Anything in the JSON is readable by anyone who opens devtools or the service worker cache.*

**AC-2.2 Scope is applied before the payload is built**
Given the fixture, When `/prepare` is called, Then item `7777 SHERWIN SAMPLE 1L` is absent from `items`.

**AC-2.3 No counter endpoint leaks another counter's numbers**
Given tag 1.1 has a pass 1 from Budi, When Sari's device fetches anything for tag 1.1 before submitting her pass 2, Then no response contains Budi's quantities.

**AC-2.4 Pass 3 is the single exception**
Given tag 1.3 has a selisih hitung and Rina is assigned pass 3, When Rina opens tag 1.3, Then both prior quantities are shown, and this is the only screen in the system where that is true.

**AC-2.5 Peta Barang is not reachable from the counting app**
Given a bound counter device, When `/api/sessions/:id/peta-barang` is called with that device's credentials, Then the response is 403 and no data is returned.

**AC-2.6 Daftar Barang is reviewer and admin only**
Given a bound counter device, When `/api/sessions/:id/items` is called, Then the response is 403.

**AC-2.7 Server side, not UI**
Given AC-2.5 and AC-2.6, When the requests are sent with curl rather than through the app, Then the results are identical. No criterion in this section may be satisfied by hiding a screen.

---

## AC-3. Master data and the session pin

**AC-3.1 Denah renders proportionally**
Given Lokasi I with weights 3, 2, 1, When the denah is rendered, Then tag 1.1 occupies three times the height of tag 1.3 and the sum fills the column.

**AC-3.2 Weight is never shown as a number**
Given the denah editor, When a tag's size is set, Then the control offers besar, sedang and kecil only, and no numeric weight appears in the UI.

**AC-3.3 Opening a session writes the pin**
Given the fixture denah and a session moving `draft → open`, When the transition completes, Then `session_tags` holds exactly 6 rows for that session, each carrying `nomor`, `lokasi_nama` and `gudang_nama` copied from master.

**AC-3.4 The pin does not move when master data changes**
Given the session is open and `session_tags` is written, When lokasi `Lokasi III` is renamed to `Lokasi III A` in master data, Then every report and every denah render for that session still reads `Lokasi III`, and `session_tags` is unchanged.

*This is the layout equivalent of AC-4.4 below. A historical report that changes meaning is not a record.*

**AC-3.5 A tag number cannot be edited once used**
Given tag 1.3 appears in `session_tags` for any session, When its `nomor` is updated, Then the update is refused and the message tells the user to retire the tag and create a new one.

**AC-3.6 Tags are retired, never deleted**
Given tag 1.3 has count rows, When a delete is attempted through any endpoint, Then no delete endpoint exists for it, and retiring it sets `retired_at` while leaving the row and its counts intact.

**AC-3.7 A retired tag leaves history readable**
Given tag 1.3 is retired after the 2026 session closed, When the 2026 reports are opened, Then tag 1.3 still appears in them with its pinned name.

**AC-3.8 A new tag does not reach a running session**
Given a session is `counting`, When tag 1.4 is added to master data, Then it does not appear in any counter's task list, it is not in `session_tags`, and a count submitted against it is refused.

**AC-3.9 Delta printing**
Given 6 tags were printed and 2 new tags were added before the next session opened, When tag printing is run with new only, Then the PDF holds exactly 2 cards.

**AC-3.10 Tag cards carry no QR**
Given a generated tag PDF, When a card is inspected, Then it carries the tag number in large type, the gudang and the lokasi name, and no QR code, barcode or scannable mark of any kind.

---

## AC-4. Import and snapshot

**AC-4.1 Raw rows are kept**
Given an import of 12.480 rows, When the import completes, Then `import_rows` holds 12.480 rows with every source column preserved as text.

**AC-4.2 Leading zeros survive**
Given a source row with `Kode_Barang = 0123`, When it is imported, Then the stored value is exactly `0123`, not `123`, in both `import_rows` and `snapshot_items`.

**AC-4.3 Aggregation across `Tag_No`**
Given item `1234` appears on 3 source rows in Gudang 01 with quantities 10, 20 and 10, When the import completes, Then `snapshot_items` holds one row for that item in that gudang with `qty_onhand = 40` and `source_row_count = 3`.

**AC-4.4 Price is copied, not referenced**
Given the snapshot stores `harga_satuan = 85.000` for item 1234, When the price changes in the source system and a new session is imported, Then the 2026 session's `harga_satuan` is still exactly 85.000 and its report totals are unchanged to the rupiah.

*The single most important criterion in this section. If it fails, every signed report in the filing cabinet is now wrong, and nobody will notice until an audit.*

**AC-4.5 `Total_Harga` is not stored**
Given the snapshot table, When its columns are inspected, Then no `total_harga` column exists.

**AC-4.6 Scope filter**
Given the fixture scope, When the import runs, Then item `7777` is excluded from `snapshot_items` and the confirmation screen reports it under the filtered count.

**AC-4.7 Confirmation before commit**
Given a parsed file, When the confirmation screen is shown, Then `snapshot_items` is still empty, and the rows appear only after Simpan Snapshot is pressed.

**AC-4.8 Unknown gudang refuses the whole file**
Given a file containing `Nama_Gudang = GUDANG PUSAT`, When it is imported, Then the import is refused, the message names the first offending row number and the total count of offending rows, and `snapshot_items` is unchanged.

*Refusing beats skipping. Skipping silently drops a whole warehouse from the count.*

**AC-4.9 Missing column refuses**
Given a file with no `Kode_Barang` column, When it is imported, Then it is refused and names the missing column.

**AC-4.10 Duplicate barcode refuses**
Given two different `Kode_Barang` values sharing `barcode_4 = 1234`, When the file is imported, Then it is refused and the message names both product names.

**AC-4.11 Zero rows after filter refuses**
Given a file where no row matches the ticked brands, When it is imported, Then it is refused with a message pointing at the brand names.

**AC-4.12 Import is one transaction**
Given a simulated failure midway through writing `snapshot_items`, When the request fails, Then `snapshot_items` and `import_rows` for that session are both empty. Count both before and after.

**AC-4.13 File type and size**
Given a `.exe` renamed to `.xlsx`, or a 60 MB file, When upload is attempted, Then it is refused before parsing begins.

**AC-4.14 Scope is recorded on the session**
Given the import completes, When `opname_sessions.scope_filter` is read, Then it holds the four brands and one group that were ticked, and the approval screen renders that list from this column rather than from a constant in the code.

---

## AC-5. Counting entry

**AC-5.1 Code, then name, then quantity**
Given the entry screen, When `1234` is typed, Then `THINNER ASIA 5L` appears, and the Jumlah field is disabled until it does.

**AC-5.2 The name is the most prominent element after the code**
Given the entry screen with a matched item, When the rendered sizes are measured, Then the product name is larger than every other element except the code field.

**AC-5.3 Unknown code**
Given the entry screen, When `9999` is typed, Then no name appears, Jumlah and Simpan stay disabled, and the screen offers Cari Barang and Catat sebagai Tidak Dikenal.

**AC-5.4 The typo trap is not caught by the system, and that is known**
Given item 1234 is physically present, When the counter types `1243` and saves 12, Then the system accepts it, because `1243` is a valid item. The count is wrong and nothing in the data shows it.

*This criterion passes by accepting the row. It is written down so nobody later believes the system validates item identity. The defences are the displayed name and the double count, and they are tested in AC-5.2 and AC-8.*

**AC-5.5 Cari Barang works offline**
Given the device is in airplane mode, When `thinner` is searched, Then both 1234 and 1243 are returned from the downloaded list, and picking one fills in its code.

**AC-5.6 Cari Barang shows no quantity or price**
Given any search result, When it is inspected, Then it carries the code, name and brand only.

**AC-5.7 Calculator returns a number, not an expression**
Given the quantity field, When the calculator is opened and `12 × 24 + 3` is entered and applied, Then the field holds `291`, the stored row has `qty = 291` and `qty_note = "12 × 24 + 3"`.

**AC-5.8 The quantity field itself rejects an expression**
Given the quantity field, When `12*24` is typed directly into it, Then it is not accepted as a value.

**AC-5.9 `qty_note` is null when the calculator was not used**
Given a quantity typed directly, When the row is inspected, Then `qty_note` is null.

**AC-5.10 Duplicate item on one tag**
Given item 1234 already recorded as 5 baik on tag 1.1 pass 1, When 3 is entered for the same item and condition, Then the Ganti or Tambahkan prompt appears, Ganti stores 3 and Tambahkan stores 8.

**AC-5.11 Both options are inserts, not updates**
Given AC-5.10 is run with Tambahkan, When `counts` is inspected, Then it holds two rows for that key, the later one with `qty = 8`, and the first row is unchanged.

*There is no update path in this table. If an `UPDATE` statement exists anywhere against `counts`, this criterion has failed even if the number on screen is right.*

**AC-5.12 The current value is the latest row**
Given AC-5.11, When `v_current_counts` is queried for that key, Then exactly one row is returned, with `qty = 8`.

**AC-5.13 Condition is a separate key**
Given item 1180 recorded as 4 baik and 1 rusak on tag 1.1, When `v_current_counts` is queried, Then two rows exist and neither replaced the other.

**AC-5.14 Edit own open pass**
Given Budi recorded 12 for item 1234 on tag 1.1 pass 1 and has not submitted, When he taps Ubah and changes it to 10, Then a new row is written and the current value is 10.

**AC-5.15 The edit boundary**
Given tag 1.1 pass 2 has been submitted, When Budi attempts to change his pass 1 entry, Then it is refused and the message directs him to the coordinator.

*After the second pass, a difference is no longer a correction, it is a dispute. Disputes resolve through pass 3.*

**AC-5.16 Unknown items never enter variance**
Given an unknown item recorded on tag 1.1, When the selisih sistem report is produced, Then that quantity appears in no row of it, and the item appears only in the Barang Tidak Dikenal report.

**AC-5.17 Tag not assigned**
Given tag 2.4 is not assigned to Budi, When Budi tries to open it, Then it is refused on the device, and if the check is bypassed, the server refuses the row at sync.

**AC-5.18 Negative quantity**
Given the entry screen, When `-5` is submitted through the API, Then it is refused.

**AC-5.19 Tag number entry**
Given the Buka Tag screen, When `1.1` is typed, Then tag 1.1 opens. When `1.9` is typed, Then it is refused offline from the downloaded denah, naming the gudang.

**AC-5.20 No camera anywhere**
Given the whole application, When the code and every screen are searched, Then there is no `getUserMedia` call, no `<video>` element, no camera permission request and no QR library in the bundle.

---

## AC-6. Tag completion

**AC-6.1 Tag Selesai writes a fact**
Given tag 1.1 pass 1 with 7 items recorded, When Tag Selesai is pressed, Then a `tag_submissions` row is written with `is_empty = false`.

**AC-6.2 Tag Kosong requires confirmation**
Given tag 3.1 with nothing recorded, When Tag Kosong is pressed, Then a confirmation naming the tag appears, and only after confirming is a row written with `is_empty = true`.

**AC-6.3 Empty and untouched are different states**
Given tag 3.1 marked empty and tag 2.2 never opened, When the denah is rendered, Then 3.1 shows Kosong and 2.2 shows Belum dihitung, and the two are distinguishable in greyscale.

*A tag with no count rows is ambiguous: empty, or untouched? Only a person can say, and that statement is what makes "zero tags unaccounted for" provable.*

**AC-6.4 Reopen own pass before the next one**
Given Budi submitted tag 1.1 pass 1 and pass 2 has not been submitted, When he opens tag 1.1 again, Then he may add an item and resubmit.

**AC-6.5 Reopen blocked after the next pass**
Given tag 1.1 pass 2 has been submitted, When Budi opens tag 1.1, Then adding and editing are both refused.

---

## AC-7. Offline and sync

The section that decides whether a day of counting survives a bad signal.

**AC-7.1 Full offline operation**
Given preparation completed and the device put in airplane mode, When a full tag is counted from opening it to Tag Selesai, Then every step works and nothing is blocked by a network error.

**AC-7.2 Preparation requires connectivity and is all or nothing**
Given no connection, When preparation is attempted, Then entry to counting is blocked and no partial download is retained. Re-running preparation with a connection starts from zero.

**AC-7.3 The five ticks**
Given preparation completes, When the screen is read, Then all five ticks are shown: name bound, items downloaded with a count, scope downloaded, denah downloaded, tasks downloaded. Mulai Menghitung is disabled until all five are ticked.

**AC-7.4 Persistent storage warning**
Given `navigator.storage.persist()` returns false, When preparation completes, Then a warning naming the phone is shown with the install instruction, counting is **not** blocked, and the coordinator's device screen shows that phone as unprotected.

**AC-7.5 Idempotency**
Given a batch of 7 counts, When the identical batch is posted three times, Then `SELECT COUNT(*) FROM counts` is the same after all three as after the first, and every response is a success.

*Without this, counts double or triple on exactly the tags where signal was worst. It looks like a counting problem and is not, which is why it costs days to find.*

**AC-7.6 The key comes from the device**
Given a count saved while offline, When the queued row is inspected before any sync, Then `client_row_id` is already populated.

**AC-7.7 Partial rejection**
Given a batch of 7 where 2 rows are for an unassigned tag, When it is synced, Then 5 ids are returned in `accepted`, 2 in `rejected` with reasons, the device removes only the accepted 5, and the counter sees the 2 reasons.

**AC-7.8 Clock skew does not reorder**
Given a device whose clock is 5 hours behind, When it records 12 then later 10 for the same key and syncs, Then the current value is 10.

*Ordering uses `client_created_at` and is safe because one tag and pass belongs to one assigned counter on one bound device, so every row sharing an ordering key comes from one phone, and one phone's clock is internally consistent even when absolutely wrong.*

**AC-7.9 Upload survives the session closing for counting**
Given a device holds 7 unsynced counts and the session has moved to `review`, When it syncs, Then all 7 are accepted.

*Blocking this is how a shift of work disappears.*

**AC-7.10 Upload is refused once the session is approved**
Given a session in `approved`, When a sync arrives, Then it is refused and nothing is written.

**AC-7.11 Stale item ids from a previous session**
Given a device still holding a `snapshot_item_id` from the 2025 session, When it syncs into the 2026 session, Then the row is rejected.

**AC-7.12 Leaving with a pending queue**
Given 7 unsynced rows, When the counter tries to finish the shift, Then the blocking screen appears, and no path on it exits without syncing.

**AC-7.13 Automatic sync**
Given a queue and no connection, When connectivity returns, Then the queue flushes without the counter pressing anything, and the badge reaches Semua terkirim.

**AC-7.14 Service worker does not update over a queue**
Given a pending queue and a newer version deployed, When the app is used, Then the new service worker does not activate and no update prompt is shown until the queue is empty.

**AC-7.15 Storage loss is reported honestly**
Given IndexedDB is cleared while 7 rows are queued, When the app is reopened, Then it states that unsent data cannot be recovered, does not claim a recovery is possible, and directs the counter to the coordinator.

**AC-7.16 Payload size**
Given the fixture scaled to 4.900 items, When `/prepare` is fetched, Then the response is under 1 MB compressed.

---

## AC-8. The two reports

Run every one of these against hand built numbers before trusting any screen. The last two are the bugs that ship silently.

For each case, build tag 1.1 with item 1234 only, then query.

**AC-8.1 Agreement, matching system**
Given pass 1 = 10, pass 2 = 10, `qty_onhand` = 10, Then selisih hitung is empty and selisih sistem shows 0.

**AC-8.2 Agreement, differing from system**
Given pass 1 = 10, pass 2 = 10, `qty_onhand` = 8, Then selisih hitung is empty and selisih sistem shows +2.

**AC-8.3 Disagreement**
Given pass 1 = 10, pass 2 = 9, Then the item appears in selisih hitung and appears in **no** row of selisih sistem.

**AC-8.4 Resolved by pass 3**
Given pass 1 = 10, pass 2 = 9, pass 3 = 10, `qty_onhand` = 10, Then selisih hitung is empty and selisih sistem shows 0. A third count always wins.

**AC-8.5 One counter recorded nothing, the COALESCE case**
Given pass 1 = 10 and pass 2 submitted with no row for that item, Then the item appears in selisih hitung with pass 2 shown as an em dash.

*Written as `qty_1 <> qty_2` this row vanishes, because `NULL <> 10` evaluates to NULL. One counter seeing something the other missed is exactly the disagreement most worth catching. The condition must be `COALESCE(qty_1,0) <> COALESCE(qty_2,0)`.*

**AC-8.6 Nothing counted at all, the LEFT JOIN case**
Given item 9001 with `qty_onhand = 38` and no count rows anywhere, When selisih sistem is produced, Then item 9001 appears with `qty_hitung = 0` and `selisih_qty = −38`, and it also appears in the zero found report.

*An `INNER JOIN` is the natural thing to write and it silently drops this row, which is the most serious finding a stock opname can produce. The report still looks complete.*

**AC-8.7 Condition does not create variance**
Given pass 1 = 8 baik plus 2 rusak and pass 2 = 10 baik, Then selisih hitung is empty, selisih sistem for that item is 0, and the kondisi report shows the split.

*Block on objective disagreements, report subjective ones. Stalling a count over whether a tin is scratched is not worth a day of the warehouse.*

**AC-8.8 Quantity sums across tags**
Given item 1234 counted 10 on tag 1.1 and 6 on tag 2.1, both passes agreeing, `qty_onhand = 20`, Then selisih sistem shows `qty_hitung = 16` and `selisih_qty = −4` on one row for that item in that gudang.

**AC-8.9 Reconciliation is at gudang level**
Given item 1234 exists in both Gudang 01 and Gudang 02, When selisih sistem is produced, Then it holds one row per gudang and the two are never combined.

**AC-8.10 Value uses the pinned price**
Given `selisih_qty = −4` and the snapshot price 85.000, Then `selisih_nilai = −340.000`, computed from `snapshot_items.harga_satuan` and not from any current price.

**AC-8.11 Money and quantity are exact**
Given any report, When the column types are inspected, Then quantities and money are `numeric`, no currency or quantity column uses a floating point type, and re-sorting the report never changes a total.

**AC-8.12 The conditional display**
Given tag 1.1 where both passes agree, When the coordinator opens it, Then the pass comparison panel is not rendered. Given tag 1.3 where they disagree, Then it is rendered.

**AC-8.13 Peta Barang reads the pin and the agreed quantity**
Given a closed 2026 session where item 1234 was agreed at 10 on tag 1.1, When Peta Barang is searched for `1234`, Then it returns Gudang 01, Lokasi I, tag 1.1, quantity 10, and the names come from `session_tags`.

**AC-8.14 Peta Barang is empty on the first run**
Given no prior session, When Peta Barang is opened, Then it shows an empty state explaining that it fills after the first count, and does not error.

---

## AC-9. Session lifecycle

**AC-9.1 One session at a time**
Given a session in `counting`, When a second session is created and opened, Then it is refused.

**AC-9.2 `draft → open` guards**
Given a session with no snapshot, or no denah, or an unassigned tag, When open is attempted, Then it is refused and the message names which of the three is missing.

**AC-9.3 `counting → review` requires every tag answered**
Given one tag with no pass 2 submission, When review is attempted, Then it is refused and lists the open tags, each as a link.

**AC-9.4 `counting → review` requires zero selisih hitung**
Given every tag submitted twice and one item still disagreeing, When review is attempted, Then it is refused and names the count.

*This guard is what keeps counting errors out of the accounting report. Without it the two kinds of selisih arrive mixed.*

**AC-9.5 Illegal transitions**
Given a session in `draft`, When approve is called, Then 409 and the status is unchanged. Given `approved`, When approve is called again, Then 409.

**AC-9.6 Two step approval**
Given a session in `review`, When Briyan approves, Then step 1 is recorded with name and timestamp and the session stays in `review`. When Dewi approves, Then status becomes `approved`.

**AC-9.7 Approval cannot be reordered or doubled**
Given step 1 is not recorded, When step 2 is attempted, Then it is refused. Given step 1 is recorded, When Briyan approves again, Then the unique constraint on `(session_id, step)` refuses it.

**AC-9.8 Scope is stated above the button**
Given the approval screen, When it is rendered, Then the included brands, the excluded brands, the periode and the cut off appear above the approve button in body text size, and the excluded list is not in small print, a tooltip or a footnote.

**AC-9.9 Approved is immutable**
Given an approved session, When any write is attempted against its counts, submissions, snapshot or assignments, Then each is refused at the API, not only hidden in the UI.

**AC-9.10 Reopen requires a written reason**
Given an approved session, When reopen is called with an empty reason, Then it is refused. With a reason, Then it succeeds and the reason, actor and timestamp are recorded permanently.

**AC-9.11 Concurrent approval**
Given a session in `review` open in two tabs, When step 2 is approved in both, Then exactly one succeeds, the second returns 409, and exactly one approval row exists.

---

## AC-10. Monitoring

**AC-10.1 Denah status is derived, not stored**
Given the schema, When `tags` and `session_tags` are inspected, Then neither holds a status column, and the denah is computed from `tag_submissions` and `counts`.

**AC-10.2 Status transitions follow the facts**
Given tag 1.1 with no submission, Then `belum`. After pass 1 only, Then `menunggu_hitung_2`. After both agreeing, Then `selesai`. After both disagreeing, Then `selisih_hitung`. After pass 3, Then `selesai`. After both marked empty, Then `kosong`.

**AC-10.3 Two denah levels**
Given Gudang 01, When Pantau Gudang is opened, Then 26 lokasi are shown as equal tiles with rollups. When a lokasi is opened, Then its tags are shown as proportional bands.

**AC-10.4 Last sync is labelled as reported, not as truth**
Given Agus last synced 3 hours ago, When the device screen is read, Then his row is visually flagged and the pending figure is labelled as what the phone reported at its last sync.

*The system cannot see inside an offline queue. A UI that implies otherwise will be believed on the one day it matters.*

**AC-10.5 Reassignment keeps authorship**
Given Budi submitted tag 1.1 pass 1 and is then replaced on his remaining tags, When the reports are produced, Then tag 1.1 pass 1 still carries Budi's name and only the open passes moved.

**AC-10.6 Pass 3 assignment reaches the right device**
Given tag 1.3 is assigned a third count to Rina, When Rina's device syncs, Then tag 1.3 appears in her task list marked Hitung ke-3.

---

## AC-11. Export

**AC-11.1 Formula injection is neutralised**
Given an unknown item recorded with the name `=1+1`, When the Excel export is opened in Excel, Then the cell displays the literal text `=1+1` and not `2`.

*Your export carries free text typed on a phone, straight into a spreadsheet opened by finance. Before writing any text cell, if it starts with `=`, `+`, `-` or `@`, prefix a single quote. Apply it to every free text column, including `qty_note`, without deciding which are risky.*

**AC-11.2 Repeat for every free text column**
Given `=cmd|'/c calc'!A1` entered as an unknown item name, a `qty_note` and an approval note, When the export is opened, Then all three are literal text.

**AC-11.3 Workbook structure**
Given an approved session, When the export runs, Then one `.xlsx` is produced with six sheets: Ringkasan, Selisih Sistem, Selisih Hitung, Barang Tidak Ditemukan, Kondisi, Barang Tidak Dikenal.

**AC-11.4 Scope on page one**
Given the export, When the first sheet is opened, Then the included brands, excluded brands, periode and cut off appear above the figures.

**AC-11.5 Totals tie out**
Given any export, When the selisih sistem total is compared to the same figure in the application, Then they are equal to the rupiah.

**AC-11.6 PDF summary**
Given the export, When the PDF is produced, Then it carries the same scope statement, the summary figures, and both approvers with their timestamps.

**AC-11.7 No personal attribution on the export**
Given the Excel and PDF outputs, When they are inspected, Then they carry the system name and periode, and no developer credit line.

**AC-11.8 Export is blocked before approval**
Given a session in `counting`, When export is requested, Then it is refused or clearly watermarked as provisional, and never presented as a final report.

---

## AC-12. Non-functional bar

**AC-12.1 Entry speed, the headline number**
Given a counter who has had the briefing, When they record 20 consecutive items on one tag using the on screen keypad only, Then the **median** time per item is under 12 seconds, measured from first keystroke to the row appearing in the list.

Conditions that must hold for the run to count:

- the tag stays open between items, with no return to a menu
- focus lands on the code field after each save
- the keypad is numeric, never the full keyboard
- no two handed reach is required at 390px

*Record the actual median. If it lands between 12 and 18 seconds, find which condition is not working rather than quietly accepting it. Each is worth seconds, and seconds here multiply by 400 tags and two passes.*

**AC-12.2 Time one real tag**
Given a real tag holding real stock and a real counter, When it is counted end to end, Then the elapsed time is recorded and written into `04-user-flow.md` Section 2.

*One measurement replaces the entire 3 to 5 day estimate, and it decides the full versus targeted double count question.*

**AC-12.3 Phone target**
Given a mid range Android phone on Chrome at 390px, When every counter screen is exercised, Then all function correctly and no control sits in a top corner.

**AC-12.4 Install to home screen**
Given the app opened in Chrome, When it is installed to the home screen, Then it launches without browser chrome, shows the composed splash, and `navigator.storage.persist()` returns true.

**AC-12.5 Icon rendering**
Given the installed app on a device using circular icons and one using squircles, When the home screen is inspected, Then the mark is correctly cropped in both and no white box appears behind it.

**AC-12.6 Status is not carried by colour alone**
Given a screenshot of the denah, When it is converted to greyscale, Then Belum dihitung, Menunggu hitung ke-2, Selisih hitung, Selesai and Kosong remain distinguishable.

**AC-12.7 Coordinator screens at 1280 wide**
Given a 1280 by 720 viewport, When every coordinator screen is opened, Then no horizontal scrolling of the page body occurs. Wide tables scroll inside their own container.

**AC-12.8 Report speed at full size**
Given a seeded session with 4.900 items, 800 tags and 15.000 count rows, When selisih sistem, selisih hitung and the denah are each loaded, Then each completes within 2 seconds with no index beyond the six in the data model.

**AC-12.9 Sync under load**
Given 15 devices flushing 100 rows each at the same moment, When the syncs are issued concurrently, Then all succeed, no row is lost or duplicated, and the total row count is exactly 1.500.

*This is the system's heaviest moment and it happens at the end of every shift, not in testing.*

**AC-12.10 Secrets are not in the repository**
Given the codebase, When it is searched, Then no database URL, password or session secret appears in any committed file, and `.env` is git ignored.

**AC-12.11 Backup and restore, verified not assumed**
Given the production database, When a restore to a point in time 3 days ago is performed into a scratch database, Then it succeeds and the restored data is complete.

*Run this once before the dress rehearsal and once before the count. A backup that has never been restored is not a backup, it is a belief. You are the only person who can catch this.*

---

## Definition of done

A feature is done when its criteria pass, not when the screen looks finished.

Version one ships when:

- Every AC in sections 1 through 11 passes
- Every AC in section 12 passes, with **AC-12.1, AC-12.2 and AC-12.11 recorded with actual measured results**, not ticked
- The dress rehearsal on one lokasi has been run with the real counting team, three weeks before the count, including printing and placing tags and binding every phone
- These five have been run by someone other than the person who wrote the code: AC-1.8 (device pair), AC-2.1 (no quantity in the payload), AC-8.5, AC-8.6 (the two silent bugs), AC-11.1 (formula injection)

---

## Not covered by any criterion here

Restated from the PRD so the boundary stays visible: any connection to SQL Server, writing adjustments back to the ERP, QR codes, item barcode scanning, counter passwords, self service rebinding, editing the snapshot after import, any use of `Tag_No`, drag and drop denah editing, native Android, multi UoM conversion, serial or batch tracking, photo upload, notifications, automatic resolution of selisih hitung, editing another counter's numbers, year over year comparison reports, multi company and language switching, and live coverage of offline devices.

Two things are deliberately not verifiable and are stated as such rather than left to be discovered:

| | Why there is no criterion |
|---|---|
| Two counters swapping phones | Undetectable by design. Procedural, stated at the briefing |
| The contents of an offline device's queue | Not observable. The UI labels the figure as last reported |

---

## Next stage

**Stage 8: technical decisions recorded with alternatives and cost.** Most of it is assembly: the PWA choice, the append only model, the device pair rule, the master data pin, the staged SQL Server path, and the full versus targeted double count decision once AC-12.2 has a number in it.
