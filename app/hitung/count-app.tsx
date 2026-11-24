"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuDoorOpen } from "react-icons/lu";
import { BrandLockup } from "@/app/brand-lockup";
import { AisleNumberPad, NumericKeypad } from "@/app/hitung/keypad";
import {
  ActionColumn,
  AisleMeta,
  BackButton,
  DeveloperCredit,
  DeveloperCreditDialog,
  GhostButton,
  MessageOverlay,
  Overlay,
  Phone,
  PrimaryButton,
  TextLink,
  TopBar,
  WaitNote,
} from "@/app/hitung/ui";
import { toast } from "@/app/toast";
import { cardAlreadyUsed } from "@/lib/aisle-rules";
import { isFloorPlace } from "@/lib/floor-plan";
import { SESSION_ID } from "@/lib/fixture";
import { SHARE_CURRENT_SESSION } from "@/lib/testing";
import { maybeActivate } from "@/lib/offline/register-sw";
import { qtyOrDash } from "@/lib/qty-display";
import {
  allLines,
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

const edgeIcon =
  "pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-ksa-teal text-ksa-teal-deep";

type Screen =
  | "bind"
  | "prepare"
  | "home"
  | "open-aisle"
  | "confirm-aisle"
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
  const [sessionId, setSessionId] = useState(SHARE_CURRENT_SESSION ? "" : SESSION_ID);
  const [deviceId] = useState(deviceIdFromStore);
  const [screen, setScreen] = useState<Screen>("bind");
  const [counters, setCounters] = useState<CounterOption[]>([]);
  const [prepare, setPrepare] = useState<PreparePayload | null>(null);
  const [pending, setPending] = useState(0);
  const [storageOk, setStorageOk] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (message) {
      toast(message);
    }
  }, [message]);
  const [busy, setBusy] = useState(false);
  const [bindingId, setBindingId] = useState<string | null>(null);
  const [tagNomor, setTagNomor] = useState("");
  const [aisleUnlocked, setAisleUnlocked] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [pendingAisle, setPendingAisle] = useState<{
    nomor: string;
    pass: number;
    lokasi: string;
  } | null>(null);
  const [activeTag, setActiveTag] = useState<{
    id: string;
    nomor: string;
    lokasi: string;
    pass: number;
    compare?: PreparePayload["assignments"][number]["compare"];
  } | null>(null);
  const [code, setCode] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cardNo, setCardNo] = useState("");
  const [doneLines, setDoneLines] = useState<LocalLine[]>([]);
  const [qty, setQty] = useState("");
  const [kondisi, setKondisi] = useState<Kondisi>("baik");
  const [focusField, setFocusField] = useState<"code" | "qty">("code");
  const [lines, setLines] = useState<LocalLine[]>([]);
  const [search, setSearch] = useState("");
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
    if (!prepare || !selectedId) {
      return null;
    }
    return prepare.items.find((item) => item.id === selectedId) ?? null;
  }, [prepare, selectedId]);

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
    if (!SHARE_CURRENT_SESSION) {
      return;
    }
    let cancelled = false;
    void fetch("/api/sessions")
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        const rows = (await response.json()) as { id?: string }[];
        return Array.isArray(rows) ? rows[0]?.id : null;
      })
      .then((id) => {
        if (!cancelled) {
          setSessionId(id || SESSION_ID);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessionId(SESSION_ID);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionId) {
      return;
    }
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
    if (screen !== "sync") {
      return;
    }
    void allLines().then(setDoneLines);
  }, [screen, pending]);

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
      setPendingAisle(null);
      setAisleUnlocked(false);
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
    if (busy || !sessionId) {
      return;
    }
    const chosen = counters.find((counter) => counter.user_id === userId);
    setBusy(true);
    setBindingId(userId);
    setMessage("");
    toast(`Mengikat ${chosen?.nama ?? "petugas"}…`);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/bind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, device_id: deviceId }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(json.error ?? "Gagal mengikat nama.");
        return;
      }
      toast(`Terikat sebagai ${chosen?.nama ?? "petugas"}.`);
      setScreen("prepare");
      await downloadPrepare();
    } catch {
      setMessage("Tidak ada koneksi. Ikat nama di area bersinyal.");
    } finally {
      setBusy(false);
      setBindingId(null);
    }
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
        { ok: prepare.assignments.length > 0, label: `Tugas Anda diunduh  ${prepare.assignments.length} lorong` },
      ]
    : [];
  const ready = ticks.length > 0 && ticks.every((tick) => tick.ok);

  function askAisleConfirm(nomor: string, pass: number, lokasi: string) {
    setPendingAisle({ nomor, pass, lokasi });
    setTagNomor("");
    setMessage("");
    setScreen("confirm-aisle");
  }

  async function openTag(nomor: string, pass?: number) {
    if (!prepare) {
      return;
    }
    const tag = locateTag(prepare, (row) => row.nomor === nomor);
    if (!tag) {
      setMessage(`Lorong ${nomor} tidak ada di gudang ini. Periksa nomor di kertas, atau pilih dari denah.`);
      return;
    }
    const mine = prepare.assignments.filter((row) => row.tag_id === tag.id);
    const assignment =
      pass != null ? mine.find((row) => row.pass === pass) : [...mine].sort((left, right) => right.pass - left.pass)[0];
    if (!assignment) {
      setMessage("Lorong ini bukan tugas Anda.");
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
    setSelectedId(null);
    setCardNo("");
    setQty("");
    setKondisi("baik");
    setFocusField("qty");
    setEmptyConfirm(false);
    setMessage("");
    setPendingAisle(null);
    setAisleUnlocked(true);
    setScreen("count");
  }

  async function confirmAisleAndOpen() {
    if (!pendingAisle) {
      return;
    }
    const typed = tagNomor.trim();
    if (!typed) {
      setMessage("Ketik nomor lorong dari kertas Anda.");
      return;
    }
    if (typed !== pendingAisle.nomor) {
      setMessage(`Nomor tidak cocok. Lorong ini ${pendingAisle.nomor}.`);
      return;
    }
    await openTag(pendingAisle.nomor, pendingAisle.pass);
  }

  function readCard(): { nomor: string | null } | null {
    if (!activeTag) {
      return null;
    }
    const nomor = cardNo.trim();
    if (isFloorPlace(activeTag.nomor) && !nomor) {
      setMessage("Isi nomor pada kartu.");
      return null;
    }
    return { nomor: nomor || null };
  }

  async function saveLine(nextQty: string, replaceExisting = false) {
    if (!prepare || !activeTag || !matched) {
      return;
    }
    const card = readCard();
    if (!card) {
      return;
    }
    if (card.nomor && cardAlreadyUsed(
      (await allLines())
        .filter((line) => line.tag_id !== activeTag.id || line.pass !== activeTag.pass)
        .map((line) => line.nomor_kartu ?? ""),
      card.nomor,
    )) {
      setMessage("Nomor kartu ini sudah Anda pakai di HP ini.");
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
      qty_note: null,
      kondisi,
      nomor_kartu: card.nomor,
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
      qty_note: null,
      nomor_kartu: card.nomor,
    });
    setLines(await linesForTag(activeTag.id, activeTag.pass));
    await refreshPending();
    setCode("");
    setQty("");
    setDuplicate(null);
    setFocusField("code");
    setMessage("");
  }

  async function submitTag(isEmpty: boolean) {
    if (!activeTag) {
      return;
    }
    const card = readCard();
    if (!card) {
      return;
    }
    await enqueueSubmission({
      client_row_id: newClientRowId(),
      tag_id: activeTag.id,
      pass: activeTag.pass,
      is_empty: isEmpty,
      nomor_kartu: card.nomor,
      client_created_at: new Date().toISOString(),
    });
    await refreshPending();
    setEmptyConfirm(false);
    setScreen("home");
    setMessage(isEmpty ? `Lorong ${activeTag.nomor} ditandai kosong.` : `Lorong ${activeTag.nomor} selesai.`);
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
    if (focusField === "code") {
      const next = (code + digit).slice(0, 4);
      setCode(next);
      const hit = prepare?.items.find((item) => item.barcode_4 === next);
      if (hit) {
        setSelectedId(hit.id);
        setFocusField("qty");
      }
      return;
    }
    if (matched) {
      setQty((value) => value + digit);
    }
  }

  function onBack() {
    if (focusField === "code") {
      setCode((value) => value.slice(0, -1));
      return;
    }
    setQty((value) => value.slice(0, -1));
  }

  const duplicateTotal = duplicate
    ? String(Number(duplicate.existing.qty) + Number(duplicate.incoming))
    : "";

  const bar = (
    <TopBar
      name={prepare?.counter.nama ?? "Belum terikat"}
      pending={pending}
      dark={screen === "count" || screen === "search"}
      locked={screen === "prepare"}
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
        <p className="mt-2 text-sm text-[#6b6b6b]">
          {busy ? "Sedang mengikat nama. Tunggu sebentar." : "Tarik ke bawah untuk memperbarui"}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {counters.map((counter) => {
            const selected = bindingId === counter.user_id;
            return (
              <button
                key={counter.user_id}
                type="button"
                disabled={busy || !sessionId}
                aria-busy={selected}
                className={`flex items-center justify-between rounded-2xl px-4 py-4 text-left shadow-sm disabled:cursor-not-allowed ${
                  selected ? "bg-[#d7e8e2] ring-2 ring-ksa-teal" : "bg-white disabled:opacity-50"
                }`}
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
                  {selected ? (
                    <span className="text-xs text-ksa-teal-deep">Mengikat…</span>
                  ) : counter.already_bound ? (
                    <span className="text-xs text-[#8a8a8a]">Sudah terikat ke HP lain</span>
                  ) : null}
                </span>
                <span className="text-[#c5c5c5]">{selected ? "…" : "›"}</span>
              </button>
            );
          })}
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
        <p className="text-sm leading-6 text-[#5c5c5c]">
          Ketik nomor lorong dari kertas yang Anda terima hari ini. Cari barang, isi jumlah, lalu simpan. Kirim hasil
          lewat tombol di kanan atas saat ada sinyal.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            className="rounded-[28px] bg-ksa-teal px-5 py-8 text-left text-white"
            onClick={() => {
              setTagNomor("");
              setMessage("");
              setScreen("open-aisle");
            }}
          >
            <p className="text-xl font-semibold">Masukkan Nomor Lorong</p>
            <p className="mt-1 text-sm text-white/80">Nomor di kertas / kartu hari ini</p>
          </button>
          <GhostButton disabled={!aisleUnlocked} onClick={() => setScreen("tugas")}>
            Tugas Saya
          </GhostButton>
          {!aisleUnlocked ? (
            <p className="text-center text-xs text-[#8a8a8a]">Masukkan nomor lorong dulu sebelum membuka daftar tugas.</p>
          ) : null}
        </div>
        {message ? <p className="mt-4 text-sm">{message}</p> : null}
        <div className="mt-auto h-16 shrink-0" />
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
          <div className="mx-auto flex w-full max-w-[390px] items-center justify-between px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              aria-label="Tentang"
              className={`${edgeIcon} text-lg font-semibold`}
              onClick={() => setScreen("about")}
            >
              i
            </button>
            <button
              type="button"
              aria-label="Keluar"
              className={edgeIcon}
              onClick={() => {
                setMessage("");
                setLeaveOpen(true);
              }}
            >
              <LuDoorOpen size={22} />
            </button>
          </div>
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
        <BackButton className="mb-3" onClick={() => setScreen("home")} />
        {bar}
        <h1 className="text-2xl font-semibold">Tugas Saya</h1>
        <p className="mt-1 text-sm text-[#6b6b6b]">{assignedTags.length} lorong untuk hitung ini</p>
        <ul className="mt-5 flex flex-col gap-2">
          {assignedTags.map((tag) => (
            <li key={`${tag.tag_id}-${tag.pass}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-4 text-left shadow-sm"
                onClick={() => askAisleConfirm(tag.nomor, tag.pass, tag.lokasi)}
              >
                <AisleMeta nomor={tag.nomor} lokasi={tag.lokasi} pass={tag.pass} />
                <span className="shrink-0 text-xs text-ksa-teal">Buka</span>
              </button>
            </li>
          ))}
        </ul>
      </Phone>
    );
  }

  if (screen === "open-aisle") {
    return (
      <Phone>
        <BackButton className="mb-3" onClick={() => setScreen("home")} />
        {bar}
        <h1 className="text-2xl font-semibold">Nomor Lorong</h1>
        <p className="mt-2 text-sm text-[#6b6b6b]">Ketik nomor di kertas yang Anda terima hari ini, atau pilih dari denah.</p>
        <AisleNumberPad value={tagNomor} onChange={setTagNomor} />
        <ActionColumn>
          <PrimaryButton onClick={() => void openTag(tagNomor)}>Mulai Hitung</PrimaryButton>
          <GhostButton onClick={() => setScreen("denah")}>Pilih dari Denah</GhostButton>
        </ActionColumn>
        {message ? <MessageOverlay message={message} onClose={() => setMessage("")} /> : null}
      </Phone>
    );
  }

  if (screen === "confirm-aisle") {
    return (
      <Phone>
        <BackButton
          className="mb-3"
          onClick={() => {
            setPendingAisle(null);
            setTagNomor("");
            setMessage("");
            setScreen("tugas");
          }}
        />
        {bar}
        <h1 className="text-2xl font-semibold">Konfirmasi Lorong</h1>
        <p className="mt-2 text-sm text-[#6b6b6b]">
          Sebelum mulai hitung, ketik nomor di kertas untuk lorong ini.
        </p>
        {pendingAisle ? (
          <div className="mt-5 rounded-2xl bg-white px-4 py-4 shadow-sm">
            <AisleMeta nomor={pendingAisle.nomor} lokasi={pendingAisle.lokasi} pass={pendingAisle.pass} />
          </div>
        ) : null}
        <AisleNumberPad value={tagNomor} onChange={setTagNomor} />
        <ActionColumn>
          <PrimaryButton onClick={() => void confirmAisleAndOpen()}>Mulai Hitung</PrimaryButton>
        </ActionColumn>
        {message ? <MessageOverlay message={message} onClose={() => setMessage("")} /> : null}
      </Phone>
    );
  }

  if (screen === "denah") {
    return (
      <Phone>
        <BackButton className="mb-3" onClick={() => setScreen("open-aisle")} />
        {bar}
        <h1 className="text-2xl font-semibold">Pilih dari Denah</h1>
        {prepare?.denah.map((lokasi) => (
          <section key={lokasi.lokasi} className="mt-5">
            <h2 className="mb-2 text-sm text-[#6b6b6b]">{lokasi.lokasi}</h2>
            <div className="flex flex-col gap-2">
              {lokasi.tags.map((tag) => {
                const cross = prepare?.crosses?.find((row) => row.aisle === lokasi.lokasi);
                const mine = prepare?.assignments.filter((row) => row.tag_id === tag.id) ?? [];
                const assignment = [...mine].sort((left, right) => right.pass - left.pass)[0];
                return (
                  <button
                    key={tag.id}
                    type="button"
                    disabled={Boolean(cross) || !assignment}
                    className="rounded-2xl bg-ksa-sage px-4 py-4 text-left font-semibold text-ksa-teal-deep disabled:bg-[#f3d4d0]"
                    style={{ minHeight: `${40 + tag.weight * 18}px` }}
                    onClick={() => {
                      if (!assignment) {
                        return;
                      }
                      askAisleConfirm(tag.nomor, assignment.pass, lokasi.lokasi);
                    }}
                  >
                    <AisleMeta nomor={tag.nomor} pass={assignment?.pass} />
                    {cross ? <span className="mt-1 block text-sm font-normal">Kosong. {cross.note}</span> : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
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
        <div className="sticky top-0 z-10 -mx-5 bg-ksa-ink px-5 pb-3">
          <BackButton light className="mb-3" onClick={() => setScreen("count")} />
          {bar}
          <h1 className="text-2xl font-semibold">Cari Barang</h1>
          <input
            className="mt-3 w-full rounded-2xl bg-ksa-panel px-4 py-3 text-white outline-none placeholder:text-white/40"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nama atau kode"
            autoFocus
          />
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {results.slice(0, 30).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full rounded-2xl bg-ksa-panel px-4 py-3 text-left"
                onClick={() => {
                  setSelectedId(item.id);
                  setCode(item.barcode_4 ?? item.kode_barang);
                  setSearch("");
                  setQty("");
                  setScreen("count");
                  setFocusField("qty");
                }}
              >
                <span className="block font-medium">{item.nama_barang}</span>
                <span className="text-sm text-white/50">
                  {item.kode_barang}
                  {item.nama_brand ? ` · ${item.nama_brand}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Phone>
    );
  }

  if (screen === "unknown") {
    return (
      <Phone>
        <BackButton className="mb-3" onClick={() => setScreen("count")} />
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
        <BackButton
          className="mb-3"
          onClick={() => {
            setExitBlock(false);
            setScreen("home");
          }}
        />
        {bar}
        <h1 className="text-2xl font-semibold">Data hitung</h1>
        <p className="mt-1 text-sm text-[#6b6b6b]">
          Barang yang sudah Anda simpan tetap di HP ini. Angka di kanan atas adalah yang belum terkirim.
        </p>
        <div className="mt-5 rounded-[28px] bg-[#f3e2b0] px-5 py-8 text-center">
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
        <div className="mt-4">
          <PrimaryButton onClick={() => void syncNow(false)}>Kirim Sekarang</PrimaryButton>
        </div>
        <h2 className="mt-6 text-sm font-medium text-[#6b6b6b]">Sudah dicatat ({doneLines.length})</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {doneLines.map((line) => (
            <li key={line.key} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
              <span className="text-sm leading-5">{line.nama_barang}</span>
              <span className="text-xl font-semibold">{line.qty}</span>
            </li>
          ))}
        </ul>
        {message ? <p className="mt-3 text-sm">{message}</p> : null}
      </Phone>
    );
  }

  if (screen === "about") {
    return (
      <Phone>
        <BackButton className="mb-3" onClick={() => setScreen("home")} />
        {bar}
        <h1 className="text-2xl font-semibold">Stock Opname</h1>
        <p className="mt-2 text-sm text-[#5c5c5c]">Aplikasi hitung untuk petugas gudang.</p>
        <dl className="mt-8 space-y-4">
          <div>
            <dt className="text-xs tracking-wide text-[#8a8a8a] uppercase">Petugas</dt>
            <dd className="mt-1 text-xl font-semibold">{prepare?.counter.nama ?? "Belum terikat"}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-[#8a8a8a] uppercase">Sesi</dt>
            <dd className="mt-1 text-base font-medium">{prepare?.session.nama ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-[#8a8a8a] uppercase">Periode</dt>
            <dd className="mt-1 text-base">{prepare?.session.periode ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-[#8a8a8a] uppercase">Belum terkirim</dt>
            <dd className="mt-1 text-base">{pending}</dd>
          </div>
        </dl>
        <DeveloperCredit onOpen={() => setCreditOpen(true)} />
        {creditOpen ? <DeveloperCreditDialog onClose={() => setCreditOpen(false)} /> : null}
      </Phone>
    );
  }

  return (
    <Phone tone="ink">
      <BackButton light className="mb-3" onClick={() => setScreen("home")} />
      {bar}
      {activeTag ? (
        <AisleMeta nomor={activeTag.nomor} lokasi={activeTag.lokasi} pass={activeTag.pass} tone="ink" />
      ) : null}
      <p className="mt-3 text-base font-medium text-white/70">Cari barang, isi jumlah, lalu simpan.</p>
      {activeTag && isFloorPlace(activeTag.nomor) ? (
        <label className="mt-4 block text-sm">
          <span className="text-white/70">Nomor pada kartu</span>
          <input
            className="mt-1 w-full rounded-2xl bg-ksa-panel px-4 py-3 text-white outline-none"
            value={cardNo}
            onChange={(event) => setCardNo(event.target.value)}
          />
        </label>
      ) : null}
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
      <button
        type="button"
        className="mt-4 w-full rounded-full border border-white/40 py-3 text-sm font-medium"
        onClick={() => setScreen("search")}
      >
        Cari Barang
      </button>
      <p className="mt-4 text-lg font-medium leading-snug">{matched ? matched.nama_barang : "Belum ada barang"}</p>
      <p className="mt-5 text-xs uppercase tracking-wide text-white/40">Jumlah</p>
      <button
        type="button"
        disabled={!matched}
        className={`mt-1 w-full text-left text-5xl font-semibold disabled:opacity-30 ${focusField === "qty" ? "text-white" : "text-white/50"}`}
        onClick={() => setFocusField("qty")}
      >
        {qty || "0"}
      </button>
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
        <NumericKeypad variant="dark" onDigit={onDigit} onBack={onBack} />
      </div>
      <div className="mt-4">
        <PrimaryButton disabled={!matched || !qty} onClick={() => void saveLine(qty)}>
          Simpan Barang
        </PrimaryButton>
      </div>
      <div className="mt-3 text-sm">
        <button type="button" className="text-white/70" onClick={() => setScreen("unknown")}>
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
        <h2 className="mb-2 text-sm text-white/50">Sudah dicatat di lorong ini ({lines.length} barang)</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {lines.map((line) => (
            <li key={line.key} className="flex items-center justify-between gap-3 rounded-xl bg-ksa-panel px-3 py-2">
              <span className="text-sm leading-5">{line.nama_barang}</span>
              <span className="flex items-center gap-3">
                <span className="text-xl font-semibold">{line.qty}</span>
                <button
                  type="button"
                  className="text-sm text-ksa-amber"
                  onClick={() => {
                    setSelectedId(line.snapshot_item_id);
                    setCode(line.barcode_4 ?? "");
                    setQty(line.qty);
                    setKondisi(line.kondisi);
                    setFocusField("qty");
                  }}
                >
                  ubah
                </button>
              </span>
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
          Lorong Selesai
        </button>
        <button
          type="button"
          className="flex-1 rounded-full border border-white/30 py-3 text-sm"
          onClick={() => setEmptyConfirm(true)}
        >
          Lorong Kosong
        </button>
      </div>
      <button type="button" className="mt-3 text-sm text-white/50" onClick={() => setScreen("home")}>
        Tutup lorong
      </button>
      {emptyConfirm ? (
        <Overlay>
          <p className="text-lg font-semibold">Tandai lorong {activeTag?.nomor} sebagai kosong?</p>
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
          <p className="text-lg font-semibold">Barang ini sudah dicatat di lorong ini</p>
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
      {message ? <p className="mt-3 text-sm text-ksa-amber">{message}</p> : null}
    </Phone>
  );
}
