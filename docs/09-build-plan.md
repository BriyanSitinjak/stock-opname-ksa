# Build Plan

**System:** stock-opname
**Stage:** 9 of 12
**Date:** 14 October 2026
**Tools:** Cursor for writing code, GitHub for source. Workflow and prompts in `09b-cursor-and-github.md`.
**Assumed host:** Render plus Neon, per `10-stack-and-cost.md`. If you choose Vercel instead, only tasks 0.4 and 11.2 change.

---

## 0. Read this part first

The phases below add up to **43 focused working days**. That number is not the problem. This is:

```
Today                      14 October 2026
Cut off in the PRD         15 December 2026
Dress rehearsal, 3 weeks before   ~24 November 2026

Working days available     ~30
Focused days needed        43
Required output            1.4 focused days per working day
```

**You cannot build this for a December 2026 count alongside a full time operations role.** Not because 43 is wrong, but because the calendar is 30 and you do not get 5 focused days a week out of a week that already has an operations job in it.

This is arithmetic, not pessimism, and it is better to have the conversation now than in week six with half a counting app.

### The four honest options

| Option | What it costs | When to choose it |
|---|---|---|
| **A. Move the count to Q1 2027** | Operations replans one date | If the count date is movable at all. **This is the one to ask for first** |
| **B. Get the time formally allocated** | Somebody covers operations for roughly six weeks | If management wants December and is willing to pay for it in your time |
| **C. Cut to the count-critical set** | ~33 days, still does not fit 30 at a part time pace. Buys you a December only if combined with B | If December is immovable |
| **D. Run 2026 the old way, target 2027** | One more year of the 5 to 7 day merge | If A and B both fail. **Not a defeat.** Use the 2026 count to measure a real tag, test the denah on paper, and confirm the Barcode column |

**Option D has a hidden benefit worth naming.** AC-12.2 asks you to time one real tag, and the whole freeze window estimate rests on it. A 2026 manual count gives you that measurement, the real lokasi and tag counts, and a trial of the physical tag cards, for free. You would start the 2027 build with every open assumption closed.

My recommendation: **ask for A, prepare for D, and build anyway starting with Phase 0 through Phase 2.** Those eight days are useful under every option, because they prove whether the hard part works.

### If you want a December date, here is what C actually cuts

| Cut | Days saved | What you do instead in year one |
|---|---|---|
| Denah editor UI | 3 | Define the layout in the seed script. You are the only user of that screen |
| Peta Barang | 1 | It reads history that does not exist yet. Build it after the first count |
| Daftar Barang Excel download | 0.5 | The screen stays, the download waits |
| Two step approval in the app | 1.5 | Signature on the printed PDF, as today |
| Laporan pendukung breadth | 1 | Kondisi and unknown items as plain tables |
| Tentang screen | 0.5 | Version number in the footer |
| **Total** | **7.5** | Leaves ~35.5 days |

Nothing on that list touches counting, sync, or the two reports. Those are not cuttable.

---

## Confidence scale

| Level | Meaning |
|---|---|
| **High** | Familiar ground. The estimate should hold |
| **Medium** | Known shape, some unknowns. Could run 1.5x |
| **Low** | Real unknowns. Could run 2x or more. Do not plan around the optimistic number |

Estimates are **focused working days**. Calendar reality is at the bottom.

**Where the Low confidence sits in this project:** offline sync, the two report queries, the service worker, the import pipeline, and anything that can only be verified on a real Android phone. Everything else is frontend work you can already do, and it is marked High for that reason.

---

## Phase 0. Foundation

**2 days · High**

Nothing here produces a feature. It produces a deploy pipeline and a repository, which are the things you do not want to be debugging while also debugging a feature.

| # | Task | Est | Conf |
|---|---|---|---|
| 0.1 | Next.js App Router, TypeScript strict, Tailwind, IBM Plex via `next/font` | 0.25 | High |
| 0.2 | GitHub private repo, `main` protected, PR template, Actions running typecheck and lint | 0.5 | High |
| 0.3 | Neon project in Singapore, Free tier for dev, prove **direct and pooled** connection strings | 0.5 | Medium |
| 0.4 | Render service, env vars, auto deploy from `main`, preview on PR | 0.5 | Medium |
| 0.5 | Hono at `app/api/[[...route]]/route.ts`, `@hono/zod-openapi`, Swagger at `/api/docs` | 0.25 | Medium |

**Phase gate.** A deployed Render URL where `/api/docs` renders and a throwaway route returns `SELECT 1` through the **pooled** connection. Not localhost. Deployed.

*Task 0.3 is Medium only because Neon is newer to you than the rest. Prove the pooled path now. Finding a broken pooled connection after six screens exist means you cannot tell whether the fault is the connection or your code.*

---

## Phase 1. Schema, views, seed

**2 days · Medium**

| # | Task | Est | Conf |
|---|---|---|---|
| 1.1 | All 13 tables as a Prisma schema, per `03-data-model.md` | 0.75 | Medium |
| 1.2 | **Read the generated SQL before applying it.** Check types, nullability, every unique index | 0.25 | High |
| 1.3 | The six views as a hand written SQL migration | 0.5 | **Low** |
| 1.4 | Seed script that reproduces the Stage 7 fixture exactly | 0.5 | High |

**Phase gate.** `npm run seed` produces the fixture in `07-acceptance-criteria.md`, and `SELECT * FROM v_agreed` runs without error.

*Task 1.3 is Low because Prisma does not manage views. They go in a raw SQL migration you write by hand, and they are the part of the schema that silently returns wrong rows rather than failing. Write them, then immediately run the seven cases in AC-8 against hand built data. Do not wait for Phase 2.*

**Why the seed is the AC fixture and not made up data.** One set of numbers for the acceptance criteria, your manual testing and your automated tests. When AC-8.6 fails you are looking at the same item 9001 the document describes, not at something you invented last Tuesday.

---

## Phase 2. The vertical slice

**6 days · Low overall. This is the phase that decides the project.**

One thin path: import a file, open a session, bind a phone, count one tag offline, sync it, read the variance. No denah editor, no assignment screen, no printing, no approval, no export, no monitoring, and the UI can be ugly.

**Why this slice.** The things that can sink this project are offline sync, the two report queries, and the import pipeline. None of them is proven by building screens, and all three fail quietly rather than loudly. Breadth proves nothing; this path proves everything.

| # | Task | Est | Conf |
|---|---|---|---|
| 2.1 | Import: parse xlsx into `import_rows`, aggregate into `snapshot_items`, the four refusals, confirm before commit, all in one transaction | 1.5 | **Low** |
| 2.2 | Session `draft → open`, writing `session_tags` from a seeded denah | 0.5 | Medium |
| 2.3 | `POST /bind`, and `GET /prepare` with `qty_onhand` and `harga_satuan` **absent from the response** | 0.75 | Medium |
| 2.4 | IndexedDB queue, `client_row_id` on the device, `POST /counts/sync` with `ON CONFLICT DO NOTHING` and the five server checks | 2.0 | **Low** |
| 2.5 | The variance query end to end, with `LEFT JOIN` and `COALESCE` | 1.0 | **Low** |
| 2.6 | An ugly counting screen: type a code, see a name, type a quantity, save | 0.25 | High |

**Phase gate, and treat it strictly.** These pass on a deployed URL, not localhost:

- **AC-7.5** post the same batch three times, row count unchanged
- **AC-2.1** fetch `/prepare` and grep the raw JSON for `qty_onhand`, zero hits
- **AC-8.1 through AC-8.7** all seven hand built cases, especially 8.5 and 8.6
- **AC-4.3** three source rows aggregate to one item with `source_row_count = 3`

*Task 2.4 is the single riskiest half day in the project. The failure is not that sync breaks; it is that sync appears to work and silently doubles rows when a connection drops mid request. You cannot find that by using the app. You find it by posting the same batch twice on purpose, which is why AC-7.5 is a gate and not a nicety.*

**If this phase passes, the project is de-risked.** Everything after it is work you have done before. **Show it to accounting the day it passes**, ugly screens and all. A person expecting the thing is worth more than any amount of discipline, and Phase 2 is the earliest point where something real exists.

---

## Phase 3. The counting app, for real

**6 days · Medium**

Phase 2 built a screen that works. This builds the screen fifteen people will use for days.

| # | Task | Est | Conf |
|---|---|---|---|
| 3.1 | Pilih nama, binding UI, bound name in every header | 0.5 | High |
| 3.2 | Persiapan with the five ticks and the all or nothing download | 0.75 | Medium |
| 3.3 | Buka tag by typed number, denah fallback | 0.5 | High |
| 3.4 | Catat barang: code to name to quantity, numeric keypad, name large | 1.0 | High |
| 3.5 | Cari Barang, offline search over the downloaded list | 0.5 | High |
| 3.6 | Calculator popup writing into the quantity field and `qty_note` | 0.5 | Medium |
| 3.7 | Duplicate prompt, Ubah own entry, the edit boundary | 0.75 | Medium |
| 3.8 | Tag Selesai, Tag Kosong with confirmation, unknown items | 0.75 | Medium |
| 3.9 | Sync badge, sync screen, partial rejection display, blocked exit | 0.75 | Medium |

**Phase gate.** **AC-12.1 measured, not estimated.** Record 20 consecutive items and write down the median. Under 12 seconds passes. Between 12 and 18, find which of the four conditions is broken rather than accepting it, because each is worth seconds and seconds multiply by 10.000 entries.

---

## Phase 4. PWA hardening

**3 days · Low**

This phase exists separately because **none of it can be verified on your laptop.** It needs a real Android phone, installed to the home screen, with the WiFi switched off.

| # | Task | Est | Conf |
|---|---|---|---|
| 4.1 | Workbox service worker, precache the app shell, runtime strategy for the API | 1.0 | **Low** |
| 4.2 | **Update gating: the new worker must not activate while the queue is non empty** | 0.75 | **Low** |
| 4.3 | Manifest, icon set, maskable pair, splash from `06-identitas-aplikasi.md` | 0.5 | Medium |
| 4.4 | `navigator.storage.persist()` request and the refusal warning | 0.25 | Medium |
| 4.5 | Test on a real phone: install, airplane mode, count a full tag, restore signal, sync | 0.5 | **Low** |

**Phase gate.** On a physical Android phone, installed to the home screen: AC-12.4, AC-7.1, AC-7.13 and AC-7.14 all pass.

*Task 4.2 is the most dangerous code in the project. A service worker that activates over a pending queue can take a counter's shift with it, and it will do so on the one day of the year that cannot be repeated. Get this right, then never deploy during a count anyway.*

**Borrow two phones now.** One modern Android, one older cheap one. The old one is the real test.

---

## Phase 5. Master data and setup

**5 days · Medium**

| # | Task | Est | Conf |
|---|---|---|---|
| 5.1 | Denah editor, lokasi and tags, besar/sedang/kecil, live preview | 1.5 | Medium |
| 5.2 | Retire rules, immutable `nomor`, the refusal messages | 0.5 | Medium |
| 5.3 | Session creation with the scope ticks, import confirmation screen | 1.0 | Medium |
| 5.4 | Denah confirmation at session open, the new/unchanged/retired counts | 0.5 | Medium |
| 5.5 | Tag card PDF, 4 per A4, delta printing | 0.75 | Medium |
| 5.6 | Users, assignment two columns, same person refused, open guard | 0.75 | Medium |

**Phase gate.** AC-3.3 through AC-3.10, and AC-4.6 through AC-4.14.

*Task 5.5 is the one to test on the actual printer with actual tape on an actual floor, before the dress rehearsal. A tag number that is readable on screen and not from two metres away in bad light is a tag number that gets typed wrong.*

**This is the phase to cut first** if the schedule forces it. Seed the denah in SQL for year one and build 5.1 after the count.

---

## Phase 6. Monitoring

**3 days · High**

| # | Task | Est | Conf |
|---|---|---|---|
| 6.1 | Derived status query per tag, the six states | 0.75 | Medium |
| 6.2 | Pantau gudang, 26 lokasi as equal tiles with rollups | 0.75 | High |
| 6.3 | Denah lokasi, proportional bands, tag detail panel | 0.75 | High |
| 6.4 | Status petugas, last sync flagged, pending labelled as reported | 0.75 | Medium |

**Phase gate.** AC-10.1, AC-10.2, AC-10.4, and the greyscale check in AC-12.6.

---

## Phase 7. Reports and resolution

**4 days · Medium**

| # | Task | Est | Conf |
|---|---|---|---|
| 7.1 | Selisih hitung screen, the em dash case visible, assign pass 3 | 1.0 | Medium |
| 7.2 | Pass 3 screen on the phone, the only screen showing both counts | 0.5 | Medium |
| 7.3 | Selisih sistem screen, zero found highlighted | 1.0 | Medium |
| 7.4 | Kondisi, barang tidak dikenal, rekap tag | 0.75 | High |
| 7.5 | Daftar Barang, paginated and filtered | 0.5 | High |
| 7.6 | Peta Barang | 0.25 | High |

**Phase gate.** AC-8.12, AC-8.13, AC-2.4.

---

## Phase 8. Lifecycle, approval, export

**4 days · Medium**

| # | Task | Est | Conf |
|---|---|---|---|
| 8.1 | State machine and every transition guard | 1.0 | Medium |
| 8.2 | Two step approval, scope block above the button, reopen with reason | 0.75 | Medium |
| 8.3 | Excel, six sheets, print setup | 1.5 | Medium |
| 8.4 | **The formula injection guard on every free text cell** | 0.25 | High |
| 8.5 | PDF summary with scope, figures and both approvers | 0.5 | Medium |

**Phase gate.** AC-9.3, AC-9.4, AC-11.1 and AC-11.2. Type `=1+1` as an unknown item name, export, open in Excel, see literal text.

*Task 8.4 is fifteen minutes of work and it is the only genuine security vulnerability in this system. Your export carries free text typed on a phone straight into a spreadsheet opened by finance.*

---

## Phase 9. Verification and repair

**4 days · Low**

| # | Task | Est | Conf |
|---|---|---|---|
| 9.1 | Run every criterion in `07-acceptance-criteria.md` on the deployed URL | 1.0 | High |
| 9.2 | Fix what they find | 1.5 | **Low** |
| 9.3 | Load test: 15 devices flushing 100 rows each at once (AC-12.9) | 0.75 | Medium |
| 9.4 | Restore a 3 day old backup into a scratch branch (AC-12.11) | 0.25 | Medium |
| 9.5 | Greyscale, 1280 viewport, keyboard pass | 0.5 | Medium |

*9.2 is Low because nobody knows what surfaces until 9.1 runs. Budget it, and do not treat an empty result as the expected one. An AC run that finds nothing usually means the run was shallow.*

---

## Phase 10. Dress rehearsal

**4 days · Low. Three weeks before the count, not one.**

| # | Task | Est | Conf |
|---|---|---|---|
| 10.1 | Seed the real gudang, lokasi, tags and users | 0.5 | Medium |
| 10.2 | Import a real cut off export | 0.5 | Medium |
| 10.3 | Print and physically place tags on one lokasi | 0.5 | Medium |
| 10.4 | Bind every counter's real phone, install to home screen | 0.5 | Medium |
| 10.5 | **Count one lokasi for real, with the real team** | 1.0 | **Low** |
| 10.6 | Fix what it finds | 1.0 | **Low** |

**Phase gate.** AC-12.2 recorded: the measured minutes for one real tag, written into `04-user-flow.md` Section 2.

*This phase doubles as training, and the training is the point. Fifteen people using something once a year do not read documentation. They remember the morning they did it once before.*

---

## Phase 11. The count

**Not estimated in build days. This is operations.**

| # | Task |
|---|---|
| 11.1 | Runbook: briefing script, binding procedure, the four sync checkpoints, what to do when a phone dies |
| 11.2 | **Deploy freeze.** No deploys from the morning of the briefing until the session closes |
| 11.3 | Handover document, written for you in 2028 when you have forgotten why `counts` has no update path |

*11.3 is not optional and it is not for anyone else. It is for you, two years from now, with a bus factor of one.*

---

## Totals and the honest calendar

| Milestone | Focused days |
|---|---|
| Foundation plus schema | **4** |
| **Through the vertical slice, project de-risked** | **10** |
| Through PWA hardening, counting works on real phones | **19** |
| Through export, the system can run a count | **35** |
| Complete, through the dress rehearsal | **43** |

Now the part people skip. You hold a full time operations role with incidents and daily routines. **Realistic focused output on a side build is one to two days a week.**

| Focus per week | Vertical slice | Can run a count | Complete |
|---|---|---|---|
| 1 day | week 10 | week 35 | week 43 |
| 2 days | week 5 | week 18 | week 22 |
| 3 days | week 4 | week 12 | week 15 |
| 5 days, full time | week 2 | week 7 | week 9 |

At two focused days a week starting now, **the system can run a count in late February 2027 and is complete in late March.** That is the number to take into the conversation about the count date.

---

## Risks, ranked by damage

### 1. The schedule, and it is not close

Covered in Section 0. It is first on this list because it is the only risk here that is already certain rather than probable.

**Mitigation.** Have the conversation this week, with the arithmetic rather than a feeling. Options A through D are all survivable. Discovering the problem in week eight is not.

### 2. Sync doubles or loses rows and nobody notices

A dropped connection mid request, retried without an idempotency key, doubles counts on exactly the tags where signal was worst. It looks like a counting problem, which is why it costs days to find.

**Mitigation.** AC-7.5 as a Phase 2 gate. Post the same batch three times on purpose. This is also the single thing Cursor is most likely to get wrong, because the common pattern it has learned is an upsert.

### 3. The project stalls at 70 percent

The most likely failure mode for a solo part time build, and more likely than any technical risk here. The interesting problems get solved first, and what is left is empty states and edge cases with nobody waiting.

**Mitigation, built into the plan.** Phase 2 produces something demonstrable in 10 focused days. Show accounting then, not at the end. And the shippable line is Phase 8, not Phase 10, so momentum dying at 35 days still leaves a working system.

### 4. Phones behave differently in the warehouse than on your desk

Persistent storage refused, an aggressive battery saver killing the tab, an iPhone in the group, a phone that cannot install to the home screen.

**Mitigation.** Phase 4 on borrowed real hardware including one old cheap Android, and the phone census at the briefing three weeks out rather than on the morning.

### 5. The Barcode column never arrives

Without it every item is entered through Cari Barang by name, which is slower per item across roughly 10.000 entries, and the freeze window grows.

**Mitigation.** Ask for it this week. It is one request to whoever owns the SSMS export, it costs nothing, and it is worth more than the entire hosting bill.

### 6. Scope creep once accounting sees a screen

The moment Phase 2 is demonstrated, requests arrive.

**Mitigation.** The out of scope list is written and numbered in PRD Section 12. Point at it. Say yes to version two, not to version one.

---

## Definition of done, per task

A task is done when all eight are true. Not when the screen looks right.

1. It works on a **deployed URL**, not only on localhost
2. Its failure paths are handled, not just its happy path
3. It writes no `UPDATE` or `DELETE` against `counts`, `tag_submissions` or `unknown_items`
4. Any counter facing response it touches contains no `qty_onhand`, `harga_satuan` or another counter's number
5. Any pass comparison it touches uses `COALESCE`, and any snapshot join uses `LEFT JOIN`
6. Its Zod schema is defined, so `/api/docs` reflects it automatically
7. TypeScript strict passes with no `any` added
8. If it touched the schema, the generated SQL was read before it was applied

Points 3, 4 and 5 are in the Cursor rules file for exactly this reason. They are the three things an AI assistant will get wrong by default, and they are also the three that fail silently.

---

## What to build from the mockup, and in what order

The mockup has 36 boards. Do not build them in that order and do not build them all early.

**Phase 2 needs one screen and it can be ugly:** a code field, a name, a quantity, a save button.

**Phase 3 is where boards 01 to 14 get built**, and they are the only boards that matter to fifteen people for several days.

**Boards 15 to 30 are one user, you, for a few hours a year.** Build them in Phase 5 to 8 and let them be plainer than the mockup if the schedule bites.
