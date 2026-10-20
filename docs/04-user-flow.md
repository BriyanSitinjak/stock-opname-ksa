# Stage 4: User Flow, Happy Path and Failure Paths

**System:** stock-opname
**Stage:** 4 of 12
**Revision:** 2 (October 2026). Aligned with PRD rev 11, data model rev 3, and the 36 screen mockup.
**Copy:** all user facing text in Bahasa Indonesia, written as it should appear on screen.

---

## 0. What changed in revision 2

| Removed | Replaced by |
|---|---|
| QR scanning, everywhere | Type the tag number, or tap it on the denah |
| Password login | Tap your own name once, supervised. Device bound for the session |
| Camera permission failure path (old F2) | Gone. No camera is used |
| 4 preparation ticks | 5 ticks, plus a persistent storage warning |

| Added |
|---|
| One time name binding, and the device pair rule |
| Calculator popup inside the quantity field |
| Cari Barang: search the master list by name when the code is unreadable |
| Daftar Barang and Peta Barang for the coordinator |
| Tentang screen |
| Scope filter chosen per session, not per app |

---

## 1. The three users

| | Who | Device | Total time on the system |
|---|---|---|---|
| **Petugas Hitung** | 10 to 15 warehouse staff | Own Android phone | Several days, almost all on one screen |
| **Koordinator** | Briyan | Laptop, phone for spot checks | Setup, monitoring, review |
| **Akunting** | One accounting staff | Laptop | Under an hour, once, at the end |

The counter is the only user whose experience decides whether this works. Everything else is a form somebody fills in once a year.

---

## 2. Throughput: the number that sets the freeze window

```
Tags            400 to 800   (26 lokasi × 5-10 tags × 3 gudang)
Passes          × 2          (full double count)
Tag visits      800 to 1,600
Minutes per tag × 10 to 15
                ─────────────
Total           133 to 400 person hours
÷ 15 counters   9 to 27 hours each
                ≈ 1.5 to 3.5 working days of counting
```

Plus pass 3 resolution, plus half a day to place the printed tags.

**Realistic freeze window: 3 to 5 days, not one.** The win is still large. Reporting goes from 5 to 7 days after counting, to the same day. Counting itself does not get shorter, and the double count makes it longer.

Three levers if operations pushes back:

| Lever | Effect | Cost |
|---|---|---|
| More counters | Linear reduction | More training and supervision |
| Fewer, larger tags | Fewer visits, less walking | Each tag takes longer, selisih hitung harder to localise |
| Targeted double count | Roughly halves the time | Weaker. The system picks what gets verified, which is circular |

**Action before Stage 9:** time one real tag on the floor. One measurement replaces this whole estimate.

---

## 3. Happy path A: Koordinator, before the count

Each step is blocked by the one before it.

### A1. Buat sesi dan impor data

```
Sesi Opname Baru
  Nama sesi      [ Stock Opname Tahunan 2026 ]
  Periode        [ 2026-12 ]
  Waktu cut off  [ 15/12/2026 18:00 ]
  File           [ Pilih file .xlsx / .csv ]

  Brand yang dihitung
    ☑ Asia   ☑ Platinum   ☑ Infinity   ☑ Renovo
    ☐ Sherwin   ☐ Sayer Lack   ☐ Waroon
  Group yang dihitung
    ☑ Material
```

Scope is chosen here, per session, and stored on the session row. Next year's scope can differ without touching code.

The upload parses into `import_rows` and shows a confirmation **before** anything is committed:

```
Hasil pembacaan file

  Baris dibaca            12.480
  Setelah filter           8.210
  Barang unik              4.932

  Gudang 01                1.805 barang
  Gudang 02                1.640 barang
  Gudang 03                1.487 barang

  ⚠ Harga satuan kosong pada 12 barang
  ⚠ Kolom barcode belum ada di file ini

  [ Batal ]            [ Simpan Snapshot ]
```

Reading "Gudang 02: 0 barang" takes two seconds and saves the count. Cheapest safeguard in the system.

### A2. Daftar Barang

After the snapshot is saved, the coordinator can see exactly what was imported: every item, searchable, filterable by gudang, brand and group. Without this screen nobody can answer "is Infinity actually in there?" without opening the Excel file again.

### A3. Susun denah

Per gudang: add lokasi in order, add tags to each lokasi, set a size weight. Live preview beside the form.

```
Lokasi I
  Tag 1.1   besar   ███████
  Tag 1.2   sedang  ████
  Tag 1.3   kecil   ██
  [ + Tambah tag ]
```

Weight shows as **besar / sedang / kecil** (3 / 2 / 1). Nobody should think about `flex-grow`.

The denah is master data, not session data. It survives into next year. Opening a session pins a copy into `session_tags` so old reports stay readable after the layout changes. See `03b-master-data-denah.md`.

### A4. Cetak tag

```
Cetak Tag
  Gudang      [ Gudang 01 ▾ ]
  Tag         234 tag, 59 halaman A4, 4 tag per halaman
  [ Unduh PDF ]
```

Each card carries the tag number in large type, plus gudang and lokasi name. No QR code. The counter types the number or taps it on the denah, so the number itself has to be readable across a warehouse aisle.

### A5. Kelola pengguna

Name, role, gudang. No password field. Creating a counter creates a name on a list, nothing else.

### A6. Peta Barang

Answers "which lokasi and tags hold item 1234?" from the previous session's counts. Useful before the count for planning, and after it for finding stock. Empty on the first run, which is expected.

### A7. Bagi tugas

Two columns per gudang, hitung 1 and hitung 2. **The system refuses to put the same person in both columns for one tag**, and says why rather than silently rejecting the field.

### A8. Buka sesi

Blocked until every tag has both passes assigned. The blocking message names what is missing. This transition writes `session_tags`.

---

## 4. Happy path B: Petugas Hitung, on the day

The critical path. The counter is on this screen for days.

### B1. Pilih nama, once, at the briefing

```
Siapa Anda?

  [ Budi Santoso     ]
  [ Sari Wulandari   ]
  [ Ahmad Hidayat    ]
  ...

  Pilih nama Anda sendiri.
  Nama ini akan terikat ke HP ini sampai opname selesai.
```

No password, no code, no slip of paper. The counter taps their own name while the coordinator is standing next to them. From then on this phone *is* Budi, and the name sits in the header of every screen.

**Why this and nothing stronger.** Anything the counter has to remember or carry can be forgotten, lost, or handed to someone else. A printed code in a pocket is passed around as easily as a name is tapped. The real protection is elsewhere: the server refuses pass 2 from the device that submitted pass 1, so one person cannot count the same tag twice no matter whose name is on the phone.

### B2. Persiapan, in a signal area

```
Persiapan

  ✓ Nama terikat: Budi Santoso
  ✓ Daftar barang diunduh        4.932 barang
  ✓ Lingkup opname diunduh       4 brand, 1 group
  ✓ Denah gudang diunduh
  ✓ Tugas Anda diunduh           38 tag

  SIAP DIPAKAI TANPA SINYAL

  [ Mulai Menghitung ]
```

Nothing proceeds until all five lines are ticked. The counter is told, at the briefing and on this screen, to see this before walking in.

**Plus one check that is not a tick.** The app calls `navigator.storage.persist()` here. When it succeeds, nothing is shown, because a green tick on fifteen phones teaches nobody anything. When it is refused, a warning appears instead:

> ⚠ **HP ini belum mengizinkan penyimpanan permanen.**
> Pasang aplikasi ke layar utama lewat menu browser, lalu buka lagi dari ikonnya.
> Kalau tetap tidak bisa, lapor ke koordinator sebelum masuk gudang.

This is the only preparation condition the coordinator cannot verify by looking at the screen, which is why it gets its own treatment. See F1b.

### B3. Buka tag

```
Buka Tag

  Nomor tag
  [ 1 . 1 ]

  [ Buka ]

  [ Pilih dari Denah ]
```

Numeric keypad. Typing the number is the default because it is the fastest and it works in the dark, in the cold, with gloves, and with a torn card. The denah is the fallback when the card is missing entirely.

### B4. Isi tag, catat barang

```
┌──────────────────────────────┐
│ Tag 1.1      Lokasi I        │
│ Hitung ke-1  ·  Budi         │
├──────────────────────────────┤
│ Kode barang                  │
│      [ 1 2 3 4 ]             │
│                              │
│  THINNER ASIA 5L             │
│                              │
│ Jumlah    [ 12 ]  [ 🖩 ]      │
│ Kondisi   ◉ Baik             │
│           ○ Rusak            │
│           ○ Kadaluarsa       │
│                              │
│     [ Simpan Barang ]        │
│     [ Cari Barang ]          │
└──────────────────────────────┘
```

The sequence that matters: **four digits → the name appears → quantity.** The name is large, it is the confirmation, and the quantity field stays locked until a name is on screen.

**Kalkulator.** The 🖩 button opens a popup for counting cartons: `12 × 24 + 3`. The result is written into the quantity field, and the expression is stored in `qty_note`. Counters currently do this arithmetic on paper or in their head, which is where quantity errors come from.

**Cari Barang.** When the 4 digit code is rubbed off or unreadable, the counter searches the master list by name. Pick the item and the code fills itself in. This is the honest alternative to guessing a code.

Below the form, the running list for this tag:

```
Sudah dicatat di tag ini  (7 barang)

  1234  THINNER ASIA 5L        12  Baik   [ ubah ]
  1180  CAT PLATINUM PUTIH 1L   4  Baik   [ ubah ]
  1180  CAT PLATINUM PUTIH 1L   1  Rusak  [ ubah ]
```

**Ubah** edits the counter's own entry while their own pass is still open. Correcting your own work before you submit is normal and the system should not make it a ceremony. Underneath it is a new row, not an update.

### B5. Selesaikan tag

```
  [ Tag Selesai ]        [ Tag Kosong ]
```

**Tag Kosong is a deliberate action, not an empty submission.** It asks once:

> **Tandai Tag 1.1 sebagai kosong?**
> Artinya Anda sudah mengecek dan tidak ada barang di area ini.
> [ Batal ]  [ Ya, kosong ]

A zero count is the most serious finding in the whole report, so it has to be a statement, not a blank.

### B6. Sinkronisasi

Always visible, top right:

```
  ⬤ 7 belum terkirim          (abu abu)
  ⬤ Semua terkirim            (hijau)
```

Tapping it opens the sync screen with a manual **Kirim Sekarang**. The app also syncs by itself whenever a connection appears. Four scheduled checkpoints a day: morning break, lunch, afternoon break, end of shift.

### B7. Akhir shift

If the counter tries to finish with a non empty queue:

> **Masih ada 7 data belum terkirim**
> Jangan tinggalkan gudang sebelum angka ini nol.
> Cari area bersinyal, lalu tekan Kirim Sekarang.
> [ Kembali ]  [ Kirim Sekarang ]

There is no "keluar saja". PRD Risk 9 made into a wall rather than a suggestion.

### B8. Tentang

Version, build date, bound name, last sync, storage status, and a short line on what the app is for. Reached from the counter's home screen. Also where the attribution lives, per `06-identitas-aplikasi.md`.

---

## 5. Happy path C: Koordinator, during the count

### C1. Pantau gudang, then lokasi

```
Gudang 01                       182 / 234 tag selesai

  Lokasi I    ████████░░   8/10
  Lokasi II   ██████████   9/9
  Lokasi III  ███░░░░░░░   2/7      ← 1 selisih hitung
```

Tapping a lokasi opens its denah: proportional bands in the warehouse shape, colour coded per PRD Section 9.

### C2. Status petugas

Counters, last sync time, reported pending count. **A counter whose last sync was three hours ago is the thing a coordinator must notice**, so it is visually obvious rather than a column to scan.

### C3. Selesaikan selisih hitung

```
Selisih Hitung                              4 tag

  Tag 1.3   1234 THINNER ASIA 5L   Hitung 1: 12   Hitung 2: 10
            Budi / Sari
            [ Tugaskan hitung ke-3 ▾ ]
```

Assigning a third count pushes the tag into that person's task list. The pass 3 screen is the only screen in the system that shows both prior numbers, because resolving requires seeing them.

---

## 6. Happy path D: Review, approval, close

| Step | Screen | Guard |
|---|---|---|
| D1 | Selisih hitung must read **0 tag** | `counting → review` blocked otherwise |
| D2 | Barang tidak ditemukan: counted zero, system above zero | Physical confirmation before approving |
| D3 | Selisih sistem: quantity, percentage, value | The finding |
| D4 | Kondisi: baik, rusak, kadaluarsa | Informational, does not affect variance |
| D5 | Persetujuan, two steps | Koordinator, then Akunting |
| D6 | Ekspor Excel and PDF | Session closes, becomes immutable |

The approval screen states the scope in plain words above the button, so nobody approves without seeing what was and was not counted:

> Laporan ini mencakup brand Asia, Platinum, Infinity, Renovo dan group Material.
> **Tidak termasuk** Sherwin, Sayer Lack, Waroon.
> Periode 2026-12, cut off 15/12/2026 18:00.

---

## 7. Failure paths

### 7.1 Counter, identity and preparation

| # | Trigger | On screen | System behaviour |
|---|---|---|---|
| F1 | No signal during preparation | **Tidak ada koneksi.** Persiapan harus dilakukan di area bersinyal. Cari area dekat kantor gudang, lalu coba lagi. | Blocks entry to counting. A partial download is discarded, never kept |
| F1b | Persistent storage refused | **HP ini belum mengizinkan penyimpanan permanen.** Pasang aplikasi ke layar utama lewat menu browser, lalu buka lagi dari ikonnya. | Does **not** block counting, because blocking would strand a counter over a browser setting. It is a loud warning plus a line on the coordinator's device screen, and it is the signal to move that person to a spare Android or to paper |
| F2 | Name already bound to another phone | **Budi Santoso sudah terikat ke HP lain.** Perangkat: Samsung A52. Hubungi koordinator jika ini HP baru. | Binding refused. See F24 for the override |
| F3 | Wrong name tapped, noticed immediately | **Ganti nama di HP ini?** Hanya koordinator yang bisa. | Deliberately not self service. Otherwise the binding means nothing |
| F4 | Session not yet open | **Sesi opname belum dibuka.** Hubungi koordinator. | |

### 7.2 Counter, while counting

| # | Trigger | On screen | System behaviour |
|---|---|---|---|
| F5 | Tag number typed does not exist | **Tag 1.9 tidak ada di gudang ini.** Periksa nomor pada kartu, atau pilih dari denah. | Checked against the downloaded denah, offline |
| F6 | Tag card missing or unreadable | No error. Counter opens the denah and taps the tag | The denah is the standing fallback, not an exception path |
| F7 | Barcode not in the master | **Kode 1234 tidak ditemukan.** Periksa kembali kode pada barang. Jika barang memang tidak ada di daftar, catat sebagai barang tidak dikenal. [ Catat sebagai Tidak Dikenal ] | Routes to `unknown_items`, never into the main count |
| F8 | Code unreadable on the item | Counter taps **Cari Barang** and searches by name | Searches the downloaded master, offline |
| F9 | **Barcode valid but wrong item** | No error. The name on screen is the only signal | **The typo trap.** The large name and the mandatory read are the whole defence, backed by the double count. Nothing else can catch it |
| F10 | Same item entered twice on one tag | **Barang ini sudah dicatat: 5 pcs.** Mau diganti atau ditambahkan? [ Ganti jadi 3 ]  [ Jadikan 8 ] | The model is replace only. "Tambahkan" computes 5+3 on the device and submits 8 as the new value. The user's mental model is served without changing the model |
| F11 | Tag already submitted for this pass | **Tag 1.1 sudah Anda selesaikan.** Mau membuka kembali untuk menambah barang? | Allowed while the next pass has not been submitted. See F15 |
| F12 | Tag not assigned to this user | **Tag ini bukan tugas Anda.** Tag 2.4 ditugaskan kepada Sari. | Checked on the device from the downloaded assignments, and again on the server at sync |
| F13 | Assigned to pass 2 on a tag they did pass 1 | Cannot occur. Blocked at assignment | The server also refuses the row at sync, by device. Two checks, one rule |

### 7.3 Counter, sync and data loss

| # | Trigger | On screen | System behaviour |
|---|---|---|---|
| F14 | Sync partially rejected | **5 dari 7 data terkirim.** 2 data ditolak: Tag 2.4 bukan tugas Anda. Hubungi koordinator. | Accepted ids leave the queue, rejected ids stay with their reason attached |
| F15 | Correcting pass 1 after pass 2 is in | **Hitung ke-2 sudah selesai untuk tag ini.** Perubahan harus lewat koordinator. | After the second pass a difference is no longer a correction, it is a dispute, and it resolves through pass 3 |
| F16 | Browser storage cleared or evicted | **Data lokal hilang.** Data yang sudah terkirim aman. Data yang belum terkirim tidak bisa dipulihkan. Hubungi koordinator sebelum melanjutkan. | Honest, because nothing can be recovered. Reduced by persistent storage, home screen install and frequent sync. Never eliminated |
| F17 | Phone lost or broken | Nothing on screen | The coordinator sees that counter's last sync time and pending count, and reassigns their open tags |
| F18 | Session moved to review while counting | **Sesi sudah ditutup untuk penghitungan.** Data Anda yang belum terkirim masih bisa dikirim. [ Kirim Sekarang ] | **Upload stays open after counting closes.** Blocking it is how a shift of work disappears |
| F19 | App update available mid shift | No prompt while a queue is pending | The service worker must not activate a new version while unsynced rows exist. See Section 9 |

### 7.4 Koordinator

| # | Trigger | On screen | System behaviour |
|---|---|---|---|
| F20 | Import, unknown `Nama_Gudang` | **Gudang "GUDANG PUSAT" tidak dikenali** pada baris 3.411 dan 846 baris lain. Impor dibatalkan. | Refuses the whole file. Skipping would silently drop a warehouse |
| F21 | Import, missing column | **Kolom `Kode_Barang` tidak ditemukan.** Impor dibatalkan. | |
| F22 | Import, duplicate barcode | **Kode 1234 dipakai oleh 2 barang berbeda:** THINNER ASIA 5L, CAT ASIA 5L. Perbaiki di sistem sumber lalu ekspor ulang. | Refuses. The typo trap at its source, and cheaper to fix here than to explain later |
| F23 | Import, zero rows after filter | **Tidak ada barang setelah filter.** Periksa nama brand dan group pada file. | Usually the brand strings do not match |
| F24 | Counter needs a new phone | **Pindahkan Budi Santoso ke HP baru?** Data yang belum terkirim di HP lama tidak bisa dilihat sistem dan bisa hilang. | Coordinator only. The confirmation names the risk in plain words |
| F25 | Denah changed after tags printed | **12 tag baru belum dicetak.** [ Cetak tag baru saja ] | Prints only the delta, never the whole gudang again |
| F26 | Denah edited while a session is open | **Sesi 2026 sedang berjalan.** Perubahan denah berlaku untuk opname berikutnya, bukan sesi ini. | `session_tags` is already pinned. Master data changes do not reach a running session |
| F27 | Renaming a tag that has history | **Tag 1.3 tidak bisa diganti nomornya.** Nomor ini sudah dipakai pada opname 2026. Pensiunkan tag ini lalu buat tag baru. | Rule 2 in `03b`. Retire plus create, never update |
| F28 | Move to review with open tags | **Belum bisa ditutup.** 14 tag belum selesai, 4 tag masih selisih hitung. | Lists them, each one a link |
| F29 | Counter absent, tags need reassigning | Reassign on the assignment screen | Submitted counts keep the original counter's name. Only the open passes move |
| F30 | Reopen an approved session | Requires a written reason, recorded | Same pattern as teknisi-expense |

---

## 8. Copy reference

### Status tag

| Status | Label |
|---|---|
| `belum` | Belum dihitung |
| `menunggu_hitung_2` | Menunggu hitung ke-2 |
| `selisih_hitung` | Selisih hitung |
| `selesai` | Selesai |
| `kosong` | Kosong |

### Tombol

Mulai Menghitung · Simpan Barang · Cari Barang · Tag Selesai · Tag Kosong · Kirim Sekarang · Buka · Pilih dari Denah · Catat sebagai Tidak Dikenal · Tugaskan Hitung ke-3 · Simpan Snapshot · Unduh PDF · Ubah

### Label tetap

Kode barang · Nama barang · Jumlah · Kondisi (Baik / Rusak / Kadaluarsa) · Hitung ke-1 · Hitung ke-2 · Hitung ke-3 · Nomor tag · Belum terkirim · Semua terkirim · Siap dipakai tanpa sinyal · Lingkup opname · Penyimpanan permanen

### Nama laporan

Selisih Hitung · Selisih Sistem · Barang Tidak Ditemukan · Laporan Kondisi · Barang Tidak Dikenal · Rekap Tag · Peta Barang

**Two words to keep apart everywhere, in the UI and in conversation.** *Selisih hitung* is people disagreeing with each other. *Selisih sistem* is stock disagreeing with the system. If anyone starts saying just "selisih", the distinction erodes and the reports stop meaning anything.

---

## 9. Rules that are procedure, not software

1. **Do not deploy during the count.** A service worker update mid shift risks a counter's queue. Fix problems with operating workarounds and ship code after the session closes. This will be tempting and it is the wrong instinct.
2. **Bind every name at the briefing, supervised.** One phone, one name, the coordinator watching. This is the only moment identity is established.
3. **Nobody leaves the warehouse with pending above zero.** The app blocks it, but a counter can walk away with the phone in their pocket. Supervision rule.
4. **Preparation happens at the gudang office, on WiFi, before entering.** Check the five ticks on each phone at the briefing, and check that no phone is showing the storage warning.
5. **Install to home screen during the briefing.** Not optional. It is what makes Android grant persistent storage.
6. **Count tags in assigned order.** Keeps two counters out of the same aisle and makes a missing counter's gap contiguous rather than scattered.
7. **Sync at every break.** Four checkpoints beats one.
8. **Identify every iPhone before the day.** Safari's storage behaviour is weaker than Chrome's. Put those people on a spare Android or on the paper fallback.
9. **Printed tally sheets travel with the coordinator.** A fallback is only a fallback if it is physically present.

---

## 10. Decisions this stage settled

| Decision | Why |
|---|---|
| Type the tag number, denah as fallback | Faster than a camera, works with gloves and a torn card, no permission to grant, no hardware to fail |
| No password, supervised name binding | The counters are older staff. Anything to remember or carry becomes a bottleneck. See PRD Section 7 |
| Device pair rule on the server | This, not the login, is what stops one person counting a tag twice |
| Counter may edit their own open pass | Correcting your own work before submitting is normal |
| Upload stays open after the session closes | Blocking it would discard real counts to enforce a status |
| Calculator inside the quantity field | Carton arithmetic is where quantity errors come from |
| Storage warning rather than a storage tick | A tick that is green on every phone is noise. A warning on the one phone that refused is information |
| Scope chosen per session | Next year's brand list will differ. It should not be a code change |

---

## 11. Next stage

Stage 5 is folded into this document. Next is **Stage 6: clickable mockup plus Google Stitch prompts**, which is complete at 36 screens. See `05-mockup-dan-stitch.md` for the inventory and `05b-stitch-prompts.md` for the prompts.

**Before Stage 9, one measurement is worth more than any screen:** time one real tag on the floor, with a real person, counting real stock. It settles Section 2 and the full versus targeted double count decision.
