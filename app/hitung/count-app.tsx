"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandIcon, BrandLockup } from "@/app/brand-lockup";
import { NumericKeypad } from "@/app/hitung/keypad";
import { ActionColumn, GhostButton, Overlay, Phone, PrimaryButton, TextLink, TopBar, WaitNote } from "@/app/hitung/ui";
import { evaluateQtyNote } from "@/lib/calculator";
import { SESSION_ID } from "@/lib/fixture";
import { maybeActivate } from "@/lib/offline/register-sw";
import { qtyOrDash } from "@/lib/qty-display";
import {
  clearPrepare,
  enqueueCount,
  enqueueSubmission,
  enqueueUnknown,
  getLine,
  lineKey,
  linesForTag,
  loadPrepare,
  newClientRowId,
  newDeviceId,
  pendingCount,
  queueSize,
  removeAccepted,
  savePrepare,
  snapshotQueue,
  upsertLine,
  type Kondisi,
  type LocalLine,
  type PreparePayload,
} from "@/lib/offline/queue";

type Screen =
  | "bind"
  | "prepare"
  | "home"
  | "open-tag"
  | "tugas"
  | "denah"
  | "count"
  | "search"
  | "unknown"
  | "sync"
  | "about";

type CounterOption = { user_id: string; nama: string; already_bound: boolean };

const PULL_START = 12;
const PULL_RELOAD = 64;

function watchNamePull(node: HTMLDivElement, reload: () => void) {
  const page = document.documentElement;
  const previous = page.style.overscrollBehaviorY;
  page.style.overscrollBehaviorY = "contain";
  let startY = 0;
  let tracking = false;

  function atTop() {
    return window.scrollY <= 2;
  }

  function begin(y: number) {
    startY = y;
    tracking = atTop();
  }

  function move(y: number, event: Event) {
    if (tracking && atTop() && y - startY > PULL_START) {
      event.preventDefault();
    }
  }

  function end(y: number, event: Event) {
    if (!tracking) {
      return;
    }
    tracking = false;
    if (y - startY > PULL_RELOAD) {
      event.preventDefault();
      reload();
    }
  }

  function onTouchStart(event: TouchEvent) {
    if (event.touches.length !== 1) {
      tracking = false;
      return;
    }
    begin(event.touches[0].clientY);
  }

  function onTouchMove(event: TouchEvent) {
    move(event.touches[0].clientY, event);
  }

  function onTouchEnd(event: TouchEvent) {
    end(event.changedTouches[0].clientY, event);
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }
    begin(event.clientY);
    if (tracking) {
      node.setPointerCapture(event.pointerId);
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (event.pointerType !== "mouse") {
      return;
    }
    end(event.clientY, event);
  }

  node.addEventListener("touchstart", onTouchStart, { passive: true });
  node.addEventListener("touchmove", onTouchMove, { passive: false });
  node.addEventListener("touchend", onTouchEnd, { passive: false });
  node.addEventListener("pointerdown", onPointerDown);
  node.addEventListener("pointerup", onPointerUp);
  return () => {
    page.style.overscrollBehaviorY = previous;
    node.removeEventListener("touchstart", onTouchStart);
    node.removeEventListener("touchmove", onTouchMove);
    node.removeEventListener("touchend", onTouchEnd);
    node.removeEventListener("pointerdown", onPointerDown);
    node.removeEventListener("pointerup", onPointerUp);
  };
}

function locateTag(prepare: PreparePayload, match: (tag: { id: string; nomor: string }) => boolean) {
  for (const lokasi of prepare.denah) {
    const tag = lokasi.tags.find(match);
    if (tag) {
      return { ...tag, lokasi: lokasi.lokasi };
    }
  }
  return null;
}

async function fetchPrepare(sessionId: string, deviceId: string) {
  const response = await fetch(`/api/sessions/${sessionId}/prepare`, {
    headers: { "x-device-id": deviceId },
  });
  if (!response.ok) {
    const json = (await response.json()) as { error?: string };
    return { ok: false as const, error: json.error ?? "Tidak ada koneksi. Persiapan harus di area bersinyal." };
  }
  return { ok: true as const, payload: (await response.json()) as PreparePayload };
}

function deviceIdFromStore(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const stored = localStorage.getItem("device_id");
  if (stored) {
    return stored;
  }
  const generated = newDeviceId();
  localStorage.setItem("device_id", generated);
  return generated;
}

export function CountApp() {
  const sessionId = SESSION_ID;
  const [deviceId] = useState(deviceIdFromStore);
  const [screen, setScreen] = useState<Screen>("bind");
  const [counters, setCounters] = useState<CounterOption[]>([]);
  const [prepare, setPrepare] = useState<PreparePayload | null>(null);
  const [pending, setPending] = useState(0);
  const [storageOk, setStorageOk] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tagNomor, setTagNomor] = useState("");
  const [activeTag, setActiveTag] = useState<{
    id: string;
    nomor: string;
    lokasi: string;
    pass: number;
    compare?: PreparePayload["assignments"][number]["compare"];
  } | null>(null);
  const [code, setCode] = useState("");
  const [qty, setQty] = useState("");
  const [qtyNote, setQtyNote] = useState<string | null>(null);
  const [kondisi, setKondisi] = useState<Kondisi>("baik");
  const [focusField, setFocusField] = useState<"code" | "qty">("code");
  const [lines, setLines] = useState<LocalLine[]>([]);
  const [search, setSearch] = useState("");
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcExpr, setCalcExpr] = useState("");
  const [duplicate, setDuplicate] = useState<{ existing: LocalLine; incoming: string } | null>(null);
  const [emptyConfirm, setEmptyConfirm] = useState(false);
  const [exitBlock, setExitBlock] = useState(false);
  const [booting, setBooting] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const bindRef = useRef<HTMLDivElement>(null);
  const ignoreNameTap = useRef(false);
  const [unknownNama, setUnknownNama] = useState("");
  const [unknownQty, setUnknownQty] = useState("");
  const [rejected, setRejected] = useState<{ client_row_id: string; reason: string }[]>([]);

  const matched = useMemo(() => {
    if (!prepare || !code) {
      return null;
    }
    return prepare.items.find((item) => item.barcode_4 === code) ?? null;
  }, [prepare, code]);

  const refreshPending = useCallback(async () => {
    setPending(await pendingCount());
  }, []);

  const loadCounters = useCallback(async () => {
    const list = await fetch(`/api/sessions/${sessionId}/counters`);
    if (list.ok) {
      setCounters((await list.json()) as CounterOption[]);
    }
  }, [sessionId]);

  const syncNow = useCallback(
    async (silent = false) => {
      const queue = await snapshotQueue();
      const remaining = queueSize(queue);
      const response = await fetch("/api/counts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          pending_after: 0,
          counts: queue.counts,
          submissions: queue.submissions,
          unknowns: queue.unknowns,
        }),
      });
      const json = (await response.json()) as {
        accepted?: string[];
        rejected?: { client_row_id: string; reason: string }[];
        error?: string;
      };
      if (!response.ok) {
        if (!silent) {
          setMessage(json.error ?? "Sinkron gagal.");
        }
        return;
      }
      await removeAccepted(json.accepted ?? []);
      await refreshPending();
      setRejected(json.rejected ?? []);
      const left = remaining - (json.accepted?.length ?? 0);
      if (left === 0) {
        void maybeActivate();
      }
      if (!silent) {
        if ((json.rejected?.length ?? 0) > 0) {
          setMessage(
            `${json.accepted?.length ?? 0} dari ${remaining} data terkirim. ${json.rejected?.length} ditolak.`,
          );
        } else {
          setMessage(left === 0 ? "Semua terkirim." : `${json.accepted?.length ?? 0} data terkirim.`);
        }
      }
    },
    [deviceId, refreshPending],
  );

  useEffect(() => {
    void (async () => {
      try {
        await refreshPending();
        const cached = await loadPrepare();
        if (cached) {
          setPrepare(cached);
          setScreen("home");
          return;
        }
        try {
          const remote = await fetchPrepare(sessionId, deviceId);
          if (remote.ok) {
            await savePrepare(remote.payload);
            setPrepare(remote.payload);
            setScreen("prepare");
            return;
          }
        } catch {
          // stay on bind
        }
        await loadCounters();
        setScreen("bind");
      } finally {
        setBooting(false);
      }
    })();
  }, [deviceId, loadCounters, refreshPending, sessionId]);

  useEffect(() => {
    const node = bindRef.current;
    if (!node) {
      return;
    }
    return watchNamePull(node, () => {
      ignoreNameTap.current = true;
      setRefreshing(true);
      void loadCounters().finally(() => setRefreshing(false));
    });
  }, [loadCounters, screen, refreshing, booting]);

  useEffect(() => {
    const onOnline = () => {
      void syncNow(true);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [syncNow]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (pending > 0) {
        event.preventDefault();
        event.returnValue = "";
        setExitBlock(true);
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [pending]);

  async function leaveToStart() {
    setMessage("");
    if (pending > 0) {
      setExitBlock(true);
      setLeaveOpen(false);
      setScreen("sync");
      return;
    }
    setLeaving(true);
    try {
      let response: Response;
      try {
        response = await fetch(`/api/sessions/${sessionId}/devices/release`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_id: deviceId }),
        });
      } catch {
        setMessage("Tidak ada koneksi. Keluar membutuhkan sinyal.");
        return;
      }
      if (!response.ok && response.status !== 404) {
        const json = (await response.json()) as { error?: string };
        setMessage(json.error ?? "Gagal keluar.");
        return;
      }
      await clearPrepare();
      setPrepare(null);
      setActiveTag(null);
      setTagNomor("");
      setLines([]);
      setExitBlock(false);
      await loadCounters();
      setLeaveOpen(false);
      setScreen("bind");
    } finally {
      setLeaving(false);
    }
  }

  async function bindName(userId: string) {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/sessions/${sessionId}/bind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, device_id: deviceId }),
    });
    const json = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setMessage(json.error ?? "Gagal mengikat nama.");
      return;
    }
    setScreen("prepare");
    await downloadPrepare();
  }

  async function downloadPrepare() {
    setBusy(true);
    setMessage("");
    await clearPrepare();
    try {
      const remote = await fetchPrepare(sessionId, deviceId);
      if (!remote.ok) {
        await clearPrepare();
        setMessage(remote.error);
        setBusy(false);
        return;
      }
      await savePrepare(remote.payload);
      setPrepare(remote.payload);
      try {
        const persisted = await navigator.storage?.persist?.();
        setStorageOk(persisted ?? false);
      } catch {
        setStorageOk(false);
      }
    } catch {
      await clearPrepare();
      setMessage("Tidak ada koneksi. Persiapan harus dilakukan di area bersinyal.");
    }
    setBusy(false);
  }

  const ticks = prepare
    ? [
        { ok: true, label: `Nama terikat: ${prepare.counter.nama}` },
        { ok: prepare.items.length > 0, label: `Daftar barang diunduh  ${prepare.items.length} barang` },
        {
          ok: prepare.scope.brands.length > 0,
          label: `Lingkup opname diunduh  ${prepare.scope.brands.length} brand, ${prepare.scope.groups.length} group`,
        },
        { ok: prepare.denah.length > 0, label: "Denah gudang diunduh" },
        { ok: prepare.assignments.length > 0, label: `Tugas Anda diunduh  ${prepare.assignments.length} tag` },
      ]
    : [];
  const ready = ticks.length > 0 && ticks.every((tick) => tick.ok);

  async function openTag(nomor: string, pass?: number) {
    if (!prepare) {
      return;
    }
    const tag = locateTag(prepare, (row) => row.nomor === nomor);
    if (!tag) {
      setMessage(`Tag ${nomor} tidak ada di gudang ini. Periksa nomor pada kartu, atau pilih dari denah.`);
      return;
    }
    const mine = prepare.assignments.filter((row) => row.tag_id === tag.id);
    const assignment =
      pass != null ? mine.find((row) => row.pass === pass) : [...mine].sort((left, right) => right.pass - left.pass)[0];
    if (!assignment) {
      setMessage("Tag ini bukan tugas Anda.");
      return;
    }
    setActiveTag({
      id: tag.id,
      nomor: tag.nomor,
      lokasi: tag.lokasi,
      pass: assignment.pass,
      compare: assignment.pass === 3 ? assignment.compare : undefined,
    });
    setLines(await linesForTag(tag.id, assignment.pass));
    setCode("");
    setQty("");
    setQtyNote(null);
    setKondisi("baik");
    setFocusField("code");
    setEmptyConfirm(false);
    setMessage("");
    setScreen("count");
  }

  async function saveLine(nextQty: string, replaceExisting = false) {
    if (!prepare || !activeTag || !matched) {
      return;
    }
    const key = lineKey(activeTag.id, activeTag.pass, matched.id, kondisi);
    const existing = await getLine(key);
    if (existing && !replaceExisting) {
      setDuplicate({ existing, incoming: nextQty });
      return;
    }
    const row = {
      client_row_id: newClientRowId(),
      tag_id: activeTag.id,
      pass: activeTag.pass,
      snapshot_item_id: matched.id,
      qty: nextQty,
      qty_note: qtyNote,
      kondisi,
      client_created_at: new Date().toISOString(),
    };
    await enqueueCount(row);
    await upsertLine({
      key,
      tag_id: activeTag.id,
      pass: activeTag.pass,
      snapshot_item_id: matched.id,
      barcode_4: matched.barcode_4,
      nama_barang: matched.nama_barang,
      qty: nextQty,
      kondisi,
      qty_note: qtyNote,
    });
    setLines(await linesForTag(activeTag.id, activeTag.pass));
    await refreshPending();
    setCode("");
    setQty("");
    setQtyNote(null);
    setDuplicate(null);
    setFocusField("code");
    setMessage("");
  }

  async function submitTag(isEmpty: boolean) {
    if (!activeTag) {
      return;
    }
    await enqueueSubmission({
      client_row_id: newClientRowId(),
      tag_id: activeTag.id,
      pass: activeTag.pass,
      is_empty: isEmpty,
      client_created_at: new Date().toISOString(),
    });
    await refreshPending();
    setEmptyConfirm(false);
    setScreen("home");
    setMessage(isEmpty ? `Tag ${activeTag.nomor} ditandai kosong.` : `Tag ${activeTag.nomor} selesai.`);
  }

  async function saveUnknown() {
    if (!activeTag || !unknownNama || !unknownQty) {
      setMessage("Isi nama dan jumlah.");
      return;
    }
    await enqueueUnknown({
      client_row_id: newClientRowId(),
      tag_id: activeTag.id,
      pass: activeTag.pass,
      kode_input: code || null,
      nama_input: unknownNama,
      qty: unknownQty,
      kondisi,
      client_created_at: new Date().toISOString(),
    });
    await refreshPending();
    setUnknownNama("");
    setUnknownQty("");
    setScreen("count");
    setMessage("Dicatat sebagai tidak dikenal.");
  }

  const assignedTags = useMemo(() => {
    if (!prepare) {
      return [];
    }
    return prepare.assignments.flatMap((row) => {
      const tag = locateTag(prepare, (item) => item.id === row.tag_id);
      return tag ? [{ ...row, nomor: tag.nomor, lokasi: tag.lokasi, weight: tag.weight }] : [];
    });
  }, [prepare]);

  function onDigit(digit: string) {
    if (calcOpen) {
      setCalcExpr((value) => value + digit);
      return;
    }
    if (focusField === "code") {
      const next = (code + digit).slice(0, 4);
      setCode(next);
      if (prepare?.items.some((item) => item.barcode_4 === next)) {
        setFocusField("qty");
      }
    } else if (matched) {
      setQty((value) => value + digit);
      setQtyNote(null);
    }
  }

  function onBack() {
    if (calcOpen) {
      setCalcExpr((value) => value.slice(0, -1));
      return;
    }
    if (focusField === "code") {
      setCode((value) => value.slice(0, -1));
    } else {
      setQty((value) => value.slice(0, -1));
    }
  }

  const calcResult = evaluateQtyNote(calcExpr);
  const duplicateTotal = duplicate
    ? String(Number(duplicate.existing.qty) + Number(duplicate.incoming))
    : "";

  const bar = (
    <TopBar
      name={prepare?.counter.nama ?? "Belum terikat"}
      pending={pending}
      dark={screen === "count" || screen === "search"}
      onSync={() => setScreen("sync")}
      onHome={() => setScreen("home")}
    />
  );

  if (booting || (refreshing && screen === "bind")) {
    return (
      <Phone>
        <WaitNote />
      </Phone>
    );
  }

  if (screen === "bind") {
    return (
      <Phone rootRef={bindRef}>
        <BrandLockup className="h-auto w-40" />
        <h1 className="mt-6 text-3xl font-semibold leading-tight">Siapa yang memakai HP ini?</h1>
        <p className="mt-2 text-sm text-[#6b6b6b]">Tarik ke bawah untuk memperbarui</p>
        <div className="mt-6 flex flex-col gap-3">
          {counters.map((counter) => (
            <button
              key={counter.user_id}
              type="button"
              disabled={busy}
              className="flex items-center justify-between rounded-2xl bg-white px-4 py-4 text-left shadow-sm"
              onClick={() => {
                if (ignoreNameTap.current) {
                  ignoreNameTap.current = false;
                  return;
                }
                void bindName(counter.user_id);
              }}
            >
              <span>
                <span className="block font-medium">{counter.nama}</span>
                {counter.already_bound ? (
                  <span className="text-xs text-[#8a8a8a]">Sudah terikat ke HP lain</span>
                ) : null}
              </span>
              <span className="text-[#c5c5c5]">›</span>
            </button>
          ))}
        </div>
        {message ? (
          <p className="mt-4 rounded-2xl bg-[#f3d4a0] px-4 py-3 text-sm text-[#5a3b00]">{message}</p>
        ) : null}
      </Phone>
    );
  }

  if (screen === "prepare") {
    return (
      <Phone>
        {bar}
        <h1 className="text-2xl font-semibold">Persiapan</h1>
        <p className="mt-1 text-sm text-[#6b6b6b]">HP ini harus siap dipakai tanpa sinyal.</p>
        <ul className="mt-5 flex flex-col gap-3">
          {ticks.map((tick) => (
            <li key={tick.label} className="flex gap-3 rounded-2xl bg-white px-4 py-3 text-sm shadow-sm">
              <span className={tick.ok ? "text-ksa-teal" : "text-[#c5c5c5]"}>{tick.ok ? "✓" : "○"}</span>
              <span>{tick.label}</span>
            </li>
          ))}
        </ul>
        {storageOk === false ? (
          <p className="mt-4 rounded-2xl bg-[#f3d4a0] px-4 py-3 text-sm">
            HP ini belum mengizinkan penyimpanan permanen. Pasang aplikasi ke layar utama lewat menu browser,
            lalu buka lagi dari ikonnya.
          </p>
        ) : null}
        {ready ? (
          <p className="mt-5 rounded-2xl bg-ksa-sage px-4 py-3 text-center text-sm font-semibold tracking-wide text-ksa-teal-deep">
            SIAP DIPAKAI TANPA SINYAL
          </p>
        ) : null}
        <ActionColumn>
          <GhostButton onClick={() => void downloadPrepare()}>{busy ? "Mengunduh…" : "Unduh ulang"}</GhostButton>
          <PrimaryButton disabled={!ready || busy} onClick={() => setScreen("home")}>
            Mulai Menghitung
          </PrimaryButton>
        </ActionColumn>
        {message ? <p className="mt-3 text-sm text-red-800">{message}</p> : null}
      </Phone>
    );
  }

  if (screen === "home") {
    return (
      <Phone>
        {bar}
        <h1 className="sr-only">Beranda</h1>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="rounded-[28px] bg-ksa-teal px-5 py-8 text-left text-white"
            onClick={() => setScreen("open-tag")}
          >
            <p className="text-xl font-semibold">Buka Tag</p>
            <p className="mt-1 text-sm text-white/80">Ketik nomor pada kartu tag</p>
          </button>
          <GhostButton onClick={() => setScreen("tugas")}>Tugas Saya</GhostButton>
          <GhostButton onClick={() => setScreen("sync")}>Sinkronisasi</GhostButton>
        </div>
        {message ? <p className="mt-4 text-sm">{message}</p> : null}
        <div className="mt-auto flex justify-between pt-8 text-sm text-ksa-teal-deep">
          <button type="button" onClick={() => setScreen("about")}>
            Tentang
          </button>
          <button
            type="button"
            onClick={() => {
              setMessage("");
              setLeaveOpen(true);
            }}
          >
            Keluar
          </button>
        </div>
        {leaveOpen ? (
          <Overlay>
            {leaving ? (
              <WaitNote compact />
            ) : (
              <>
                <p className="text-lg font-semibold">Keluar dari HP ini?</p>
                <p className="mt-2 text-sm text-[#5c5c5c]">
                  HP ini kembali ke awal supaya rekan lain bisa memilih nama.
                </p>
                {message ? <p className="mt-3 text-sm text-red-800">{message}</p> : null}
                <div className="mt-5 flex gap-3">
                  <GhostButton onClick={() => setLeaveOpen(false)}>Batal</GhostButton>
                  <PrimaryButton onClick={() => void leaveToStart()}>Keluar</PrimaryButton>
                </div>
              </>
            )}
          </Overlay>
        ) : null}
      </Phone>
    );
  }

  if (screen === "tugas") {
    return (
      <Phone>
        {bar}
        <h1 className="text-2xl font-semibold">Tugas Saya</h1>
        <p className="mt-1 text-sm text-[#6b6b6b]">{assignedTags.length} tag untuk hitung ini</p>
        <ul className="mt-5 flex flex-col gap-2">
          {assignedTags.map((tag) => (
            <li key={`${tag.tag_id}-${tag.pass}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 text-left shadow-sm"
                onClick={() => void openTag(tag.nomor, tag.pass)}
              >
                <span>
                  <span className="block text-lg font-semibold">{tag.nomor}</span>
                  <span className="text-xs text-[#8a8a8a]">
                    {tag.lokasi} · Hitung ke-{tag.pass}
                  </span>
                </span>
                <span className="text-xs text-ksa-teal">Buka</span>
              </button>
            </li>
          ))}
        </ul>
        <TextLink className="mt-6" onClick={() => setScreen("home")}>
          Kembali
        </TextLink>
      </Phone>
    );
  }

  if (screen === "open-tag") {
    return (
      <Phone>
        {bar}
        <p className="text-sm text-[#6b6b6b]">Nomor tag</p>
        <p className="mt-2 min-h-16 text-5xl font-semibold tracking-widest">{tagNomor || " "}</p>
        <div className="mt-6">
          <NumericKeypad
            onDigit={(digit) => {
              if (digit === ".") {
                setTagNomor((value) => (value.includes(".") ? value : `${value}.`));
                return;
              }
              setTagNomor((value) => value + digit);
            }}
            onBack={() => setTagNomor((value) => value.slice(0, -1))}
          />
        </div>
        <ActionColumn>
          <PrimaryButton onClick={() => void openTag(tagNomor)}>Buka</PrimaryButton>
          <GhostButton onClick={() => setScreen("denah")}>Pilih dari Denah</GhostButton>
          <TextLink onClick={() => setScreen("home")}>Kembali</TextLink>
        </ActionColumn>
        {message ? (
          <Overlay>
            <p className="text-sm font-medium">{message}</p>
            <TextLink className="mt-4" onClick={() => setMessage("")}>
              Tutup
            </TextLink>
          </Overlay>
        ) : null}
      </Phone>
    );
  }

  if (screen === "denah") {
    return (
      <Phone>
        {bar}
        <h1 className="text-2xl font-semibold">Pilih dari Denah</h1>
        {prepare?.denah.map((lokasi) => (
          <section key={lokasi.lokasi} className="mt-5">
            <h2 className="mb-2 text-sm text-[#6b6b6b]">{lokasi.lokasi}</h2>
            <div className="flex flex-col gap-2">
              {lokasi.tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="rounded-2xl bg-ksa-sage px-4 py-4 text-left font-semibold text-ksa-teal-deep"
                  style={{ minHeight: `${40 + tag.weight * 18}px` }}
                  onClick={() => void openTag(tag.nomor)}
                >
                  Tag {tag.nomor}
                </button>
              ))}
            </div>
          </section>
        ))}
        <TextLink className="mt-6" onClick={() => setScreen("open-tag")}>
          Kembali
        </TextLink>
        {message ? <p className="mt-3 text-sm">{message}</p> : null}
      </Phone>
    );
  }

  if (screen === "search") {
    const results =
      prepare?.items.filter((item) => {
        const q = search.toLowerCase();
        return (
          item.nama_barang.toLowerCase().includes(q) ||
          item.kode_barang.toLowerCase().includes(q) ||
          (item.barcode_4 ?? "").includes(q)
        );
      }) ?? [];
    return (
      <Phone tone="ink">
        {bar}
        <h1 className="text-2xl font-semibold">Cari Barang</h1>
        <input
          className="mt-4 w-full rounded-2xl bg-ksa-panel px-4 py-3 text-white outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nama atau kode"
        />
        <ul className="mt-4 flex flex-col gap-2">
          {results.slice(0, 30).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full rounded-2xl bg-ksa-panel px-4 py-3 text-left"
                onClick={() => {
                  setCode(item.barcode_4 ?? "");
                  setSearch("");
                  setScreen("count");
                  setFocusField("qty");
                }}
              >
                <span className="block font-medium">{item.nama_barang}</span>
                <span className="text-sm text-white/50">
                  {item.barcode_4} · {item.nama_brand}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="mt-6 text-sm text-white/70" onClick={() => setScreen("count")}>
          Kembali
        </button>
      </Phone>
    );
  }

  if (screen === "unknown") {
    return (
      <Phone>
        {bar}
        <h1 className="text-2xl font-semibold">Barang tidak dikenal</h1>
        <label className="mt-5 block text-sm">
          Nama
          <input
            className="mt-1 w-full rounded-2xl bg-white px-4 py-3"
            value={unknownNama}
            onChange={(e) => setUnknownNama(e.target.value)}
          />
        </label>
        <label className="mt-3 block text-sm">
          Jumlah
          <input
            className="mt-1 w-full rounded-2xl bg-white px-4 py-3"
            inputMode="decimal"
            value={unknownQty}
            onChange={(e) => setUnknownQty(e.target.value)}
          />
        </label>
        <ActionColumn>
          <PrimaryButton onClick={() => void saveUnknown()}>Simpan</PrimaryButton>
          <TextLink onClick={() => setScreen("count")}>Batal</TextLink>
        </ActionColumn>
        {message ? <p className="mt-3 text-sm">{message}</p> : null}
      </Phone>
    );
  }

  if (screen === "sync") {
    return (
      <Phone tone="sync">
        {bar}
        <div className="rounded-[28px] bg-[#f3e2b0] px-5 py-8 text-center">
          <p className="text-5xl font-semibold">{pending}</p>
          <p className="mt-2 text-sm">data belum terkirim</p>
        </div>
        {exitBlock && pending > 0 ? (
          <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm">
            Masih ada {pending} data belum terkirim. Jangan tinggalkan gudang sebelum angka ini nol. Cari area
            bersinyal, lalu tekan Kirim Sekarang.
          </p>
        ) : null}
        {rejected.map((row) => (
          <p key={row.client_row_id} className="mt-2 text-sm text-red-800">
            {row.reason}
          </p>
        ))}
        <ActionColumn>
          <PrimaryButton onClick={() => void syncNow(false)}>Kirim Sekarang</PrimaryButton>
          <GhostButton
            onClick={() => {
              setExitBlock(false);
              setScreen("home");
            }}
          >
            Kembali
          </GhostButton>
        </ActionColumn>
        {message ? <p className="mt-3 text-sm">{message}</p> : null}
      </Phone>
    );
  }

  if (screen === "about") {
    return (
      <Phone>
        {bar}
        <BrandIcon className="mx-auto" />
        <BrandLockup width={240} height={52} className="mx-auto mt-4" />
        <p className="mt-6 text-sm leading-relaxed text-[#5c5c5c]">
          Aplikasi hitung stock opname. Satu HP, satu petugas, satu sesi.
        </p>
        <p className="mt-4 text-sm">Nama: {prepare?.counter.nama}</p>
        <p className="text-sm">Antrian: {pending}</p>
        <p className="text-sm">Penyimpanan permanen: {storageOk ? "ya" : "tidak / belum dicek"}</p>
        <TextLink className="mt-8" onClick={() => setScreen("home")}>
          Kembali
        </TextLink>
      </Phone>
    );
  }

  return (
    <Phone tone="ink">
      {bar}
      <div className="flex justify-between text-sm text-white/70">
        <span>
          Tag {activeTag?.nomor} · {activeTag?.lokasi}
        </span>
        <span>Hitung ke-{activeTag?.pass}</span>
      </div>
      {activeTag?.pass === 3 && (activeTag.compare?.length ?? 0) > 0 ? (
        <div className="mt-4 rounded-2xl bg-white p-4 text-[#1c1c1c]">
          <p className="text-sm font-medium">Hitung ke-1 dan ke-2</p>
          <ul className="mt-2 space-y-1 text-sm">
            {activeTag.compare?.map((row) => (
              <li key={row.snapshot_item_id}>
                {row.barcode_4} {row.nama_barang} · Hitung 1: {qtyOrDash(row.qty_1)} · Hitung 2: {qtyOrDash(row.qty_2)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-6 text-xs uppercase tracking-wide text-white/40">Kode barang</p>
      <button
        type="button"
        className={`mt-1 w-full text-left text-5xl font-semibold tracking-[0.2em] ${focusField === "code" ? "text-white" : "text-white/50"}`}
        onClick={() => setFocusField("code")}
      >
        {code || "····"}
      </button>
      <p className="mt-4 min-h-16 text-3xl font-semibold leading-tight">
        {matched ? matched.nama_barang : " "}
      </p>
      <p className="mt-4 text-xs uppercase tracking-wide text-white/40">Jumlah</p>
      <button
        type="button"
        disabled={!matched}
        className={`mt-1 w-full text-left text-4xl font-semibold disabled:opacity-30 ${focusField === "qty" ? "text-white" : "text-white/50"}`}
        onClick={() => setFocusField("qty")}
      >
        {qty || "0"}
      </button>
      {qtyNote ? <p className="mt-1 text-xs text-white/50">{qtyNote}</p> : null}
      <fieldset className="mt-4 flex gap-4 text-sm">
        {(["baik", "rusak", "kadaluarsa"] as const).map((value) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="radio"
              name="kondisi"
              checked={kondisi === value}
              onChange={() => setKondisi(value)}
            />
            {value[0]?.toUpperCase()}
            {value.slice(1)}
          </label>
        ))}
      </fieldset>
      <div className="mt-4">
        <NumericKeypad
          variant="dark"
          onDigit={onDigit}
          onBack={onBack}
          extra={{
            label: "🖩",
            onClick: () => {
              setCalcOpen(true);
              setCalcExpr("");
            },
          }}
        />
      </div>
      <div className="mt-4">
        <PrimaryButton disabled={!matched || !qty} onClick={() => void saveLine(qty)}>
          Simpan Barang
        </PrimaryButton>
      </div>
      <div className="mt-3 flex gap-3 text-sm">
        <button type="button" className="flex-1 text-white/70" onClick={() => setScreen("search")}>
          Cari Barang
        </button>
        <button type="button" className="flex-1 text-right text-white/70" onClick={() => setScreen("unknown")}>
          Tidak dikenal
        </button>
      </div>
      {!matched && code.length >= 4 ? (
        <p className="mt-3 text-sm text-ksa-amber">
          Kode {code} tidak ditemukan.{" "}
          <button type="button" className="underline" onClick={() => setScreen("unknown")}>
            Catat sebagai Tidak Dikenal
          </button>
        </p>
      ) : null}
      <section className="mt-5">
        <h2 className="mb-2 text-sm text-white/50">Sudah dicatat di tag ini ({lines.length} barang)</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {lines.map((line) => (
            <li key={line.key} className="flex items-center justify-between gap-2 rounded-xl bg-ksa-panel px-3 py-2">
              <span>
                {line.barcode_4} {line.nama_barang} {line.qty} {line.kondisi}
              </span>
              <button
                type="button"
                className="text-ksa-amber"
                onClick={() => {
                  setCode(line.barcode_4 ?? "");
                  setQty(line.qty);
                  setKondisi(line.kondisi);
                  setFocusField("qty");
                }}
              >
                ubah
              </button>
            </li>
          ))}
        </ul>
      </section>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-full border border-white/30 py-3 text-sm"
          onClick={() => void submitTag(false)}
        >
          Tag Selesai
        </button>
        <button
          type="button"
          className="flex-1 rounded-full border border-white/30 py-3 text-sm"
          onClick={() => setEmptyConfirm(true)}
        >
          Tag Kosong
        </button>
      </div>
      <button type="button" className="mt-3 text-sm text-white/50" onClick={() => setScreen("home")}>
        Tutup tag
      </button>
      {emptyConfirm ? (
        <Overlay>
          <p className="text-lg font-semibold">Tandai Tag {activeTag?.nomor} sebagai kosong?</p>
          <p className="mt-2 text-sm text-[#5c5c5c]">
            Artinya Anda sudah mengecek dan tidak ada barang di area ini.
          </p>
          <div className="mt-5 flex gap-3">
            <GhostButton onClick={() => setEmptyConfirm(false)}>Batal</GhostButton>
            <PrimaryButton onClick={() => void submitTag(true)}>Ya, kosong</PrimaryButton>
          </div>
        </Overlay>
      ) : null}
      {duplicate ? (
        <Overlay>
          <p className="text-lg font-semibold">Barang ini sudah dicatat di tag ini</p>
          <p className="mt-2 text-sm text-[#5c5c5c]">
            Sudah {duplicate.existing.qty} pcs. Mau diganti atau ditambahkan?
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <GhostButton
              onClick={() => {
                const next = duplicate.incoming;
                setDuplicate(null);
                void saveLine(next, true);
              }}
            >
              Ganti jadi {duplicate.incoming}
            </GhostButton>
            <PrimaryButton
              onClick={() => {
                setDuplicate(null);
                void saveLine(duplicateTotal, true);
              }}
            >
              Jadikan {duplicateTotal}
            </PrimaryButton>
          </div>
        </Overlay>
      ) : null}
      {calcOpen ? (
        <Overlay>
          <p className="text-sm text-[#6b6b6b]">Hitung jumlah</p>
          <p className="mt-2 min-h-10 text-2xl font-semibold">{calcExpr || " "}</p>
          <div className="mt-3 flex gap-2">
            {["+", "×", "-"].map((op) => (
              <button
                key={op}
                type="button"
                className="flex-1 rounded-full bg-white py-2"
                onClick={() => setCalcExpr((value) => value + op)}
              >
                {op}
              </button>
            ))}
          </div>
          <p className="mt-4 text-4xl font-semibold text-ksa-teal">{calcResult ?? "—"}</p>
          <div className="mt-5 flex flex-col gap-3">
            <PrimaryButton
              onClick={() => {
                if (!calcResult) {
                  setMessage("Ekspresi tidak sah.");
                  return;
                }
                setQty(calcResult);
                setQtyNote(calcExpr.replace(/\*/g, "×"));
                setCalcOpen(false);
                setFocusField("qty");
              }}
            >
              Pakai {calcResult ?? ""}
            </PrimaryButton>
            <TextLink onClick={() => setCalcOpen(false)}>Batal</TextLink>
          </div>
        </Overlay>
      ) : null}
      {message ? <p className="mt-3 text-sm text-ksa-amber">{message}</p> : null}
    </Phone>
  );
}
