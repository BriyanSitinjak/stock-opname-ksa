"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuDoorOpen } from "react-icons/lu";
import { BrandLockup } from "@/app/brand-lockup";
import { NumericKeypad } from "@/app/hitung/keypad";
import { PhoneDenah } from "@/app/hitung/phone-denah";
import { downloadHitungBackup } from "@/app/hitung/backup-workbook";
import { buildAisleRecords, isPass2OnlyCounter, sameUserProgressForNomor } from "@/app/hitung/aisle-records";
import { Pass2ReviewList, Pass2TagEditor, type Pass2Item } from "@/app/hitung/pass2-review";
import {
  ActionColumn,
  AisleMeta,
  BackButton,
  ConfirmOverlay,
  DeveloperCredit,
  DeveloperCreditDialog,
  GhostButton,
  MessageOverlay,
  Overlay,
  PaperNumberField,
  PassAckNote,
  PassBadge,
  Phone,
  PrefetchDeveloperCredit,
  PrimaryButton,
  QtyRow,
  SyncBusyOverlay,
  TextLink,
  TopBar,
  UnknownItemOverlay,
  UnknownRowsList,
  WaitNote,
} from "@/app/hitung/ui";
import { loadProgress, pass1NomorKartu, progressForSameUser, upsertProgress } from "@/app/hitung/local-progress";
import { toast } from "@/app/toast";
import { cardAlreadyUsed } from "@/lib/aisle-rules";
import { isFloorPlace } from "@/lib/floor-plan";
import { SESSION_ID } from "@/lib/fixture";
import { latestAssignment, locatePrepareTagByNomor } from "@/lib/prepare-locate";
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
  pendingBreakdown,
  queueSize,
  removeAccepted,
  savePrepare,
  snapshotQueue,
  upsertLine,
  type LocalLine,
  type PreparePayload,
  type UnknownRow,
} from "@/lib/offline/queue";

const DEFAULT_KONDISI = "baik" as const;

const edgeIcon =
  "pointer-events-auto flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-ksa-teal px-2 py-1.5 text-ksa-teal-deep";

type Screen =
  | "bind"
  | "prepare"
  | "home"
  | "confirm-aisle"
  | "denah"
  | "count"
  | "search"
  | "sync"
  | "about";

type CounterOption = { user_id: string; nama: string; already_bound: boolean };

const PULL_START = 12;
const PULL_RELOAD = 64;

function watchNamePull(node: HTMLDivElement, reload: () => void, onOffline?: () => void) {
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
    if (y - startY <= PULL_RELOAD) {
      return;
    }
    event.preventDefault();
    if (!navigator.onLine) {
      onOffline?.();
      return;
    }
    reload();
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
  const [pendingItems, setPendingItems] = useState(0);
  const [pendingClosures, setPendingClosures] = useState(0);
  const pending = pendingItems + pendingClosures;
  const [syncBusy, setSyncBusy] = useState<{ label: string; percent: number } | null>(null);
  const [storageOk, setStorageOk] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (message) {
      toast(message);
    }
  }, [message]);
  useEffect(() => {
    function syncOnline() {
      setOnline(navigator.onLine);
    }
    syncOnline();
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);
  const [busy, setBusy] = useState(false);
  const [bindingId, setBindingId] = useState<string | null>(null);
  const [tagNomor, setTagNomor] = useState("");
  const [online, setOnline] = useState(true);
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
    pass1?: PreparePayload["assignments"][number]["pass1"];
    pass1_nomor_kartu?: string | null;
    compare?: PreparePayload["assignments"][number]["compare"];
  } | null>(null);
  const [code, setCode] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cardNo, setCardNo] = useState("");
  const [doneLines, setDoneLines] = useState<LocalLine[]>([]);
  const [doneUnknowns, setDoneUnknowns] = useState<UnknownRow[]>([]);
  const [tagUnknowns, setTagUnknowns] = useState<UnknownRow[]>([]);
  const [qty, setQty] = useState("");
  const [focusField, setFocusField] = useState<"code" | "qty">("code");
  const [lines, setLines] = useState<LocalLine[]>([]);
  const [search, setSearch] = useState("");
  const [duplicate, setDuplicate] = useState<{ existing: LocalLine; incoming: string } | null>(null);
  const [emptyConfirm, setEmptyConfirm] = useState(false);
  const [selesaiConfirm, setSelesaiConfirm] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<"home" | "sync" | null>(null);
  const [unknownOpen, setUnknownOpen] = useState(false);
  const [editingUnknownId, setEditingUnknownId] = useState<string | null>(null);
  const [pass2EditId, setPass2EditId] = useState<string | null>(null);
  const [pass2EditQty, setPass2EditQty] = useState("");
  const [pass2EditNama, setPass2EditNama] = useState("");
  const [pass2ReplaceFor, setPass2ReplaceFor] = useState<string | null>(null);
  const [tagEditOpen, setTagEditOpen] = useState(false);
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
    const next = await pendingBreakdown();
    setPendingItems(next.items);
    setPendingClosures(next.closures);
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
      if (remaining === 0) {
        if (!silent) {
          setMessage("Tidak ada data untuk dikirim.");
        }
        return;
      }
      if (!silent) {
        setSyncBusy({ label: "Mengirim data ke server…", percent: 12 });
      }
      try {
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
        if (!silent) {
          setSyncBusy({ label: "Membuat Excel cadangan…", percent: 58 });
        }
        let excelOk = false;
        if (!silent && prepare) {
          try {
            await downloadHitungBackup(prepare, queue);
            excelOk = true;
            setSyncBusy({ label: "Menyimpan file Excel…", percent: 88 });
          } catch {
            excelOk = false;
          }
        }
        await removeAccepted(json.accepted ?? []);
        await refreshPending();
        setRejected(json.rejected ?? []);
        const left = remaining - (json.accepted?.length ?? 0);
        if (left === 0) {
          void maybeActivate();
        }
        if (!silent) {
          setSyncBusy({ label: "Selesai", percent: 100 });
          await new Promise((resolve) => window.setTimeout(resolve, 450));
          if ((json.rejected?.length ?? 0) > 0) {
            setMessage(
              excelOk
                ? `Sinkronisasi sebagian: ${json.accepted?.length ?? 0}/${remaining} terkirim, ${json.rejected?.length} ditolak. Excel cadangan diunduh.`
                : `${json.accepted?.length ?? 0} dari ${remaining} data terkirim. ${json.rejected?.length} ditolak.`,
            );
          } else if (excelOk) {
            setMessage(
              "Sinkronisasi berhasil. Excel cadangan sudah diunduh. Denah dan Pantau koordinator ikut terbarui.",
            );
          } else if (left === 0) {
            setMessage("Sinkronisasi berhasil. Excel cadangan gagal dibuat.");
          } else {
            setMessage(`${json.accepted?.length ?? 0} data terkirim.`);
          }
        }
      } finally {
        if (!silent) {
          setSyncBusy(null);
        }
      }
    },
    [deviceId, prepare, refreshPending],
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
    return watchNamePull(
      node,
      () => {
        ignoreNameTap.current = true;
        setRefreshing(true);
        void loadCounters().finally(() => setRefreshing(false));
      },
      () => {
        toast("Tidak ada internet. Tetap di layar ini. Coba lagi saat ada sinyal.");
      },
    );
  }, [loadCounters, screen, refreshing, booting]);

  useEffect(() => {
    if (screen !== "sync") {
      return;
    }
    void allLines().then(setDoneLines);
    void snapshotQueue().then((queue) => setDoneUnknowns(queue.unknowns));
  }, [screen, pending]);

  useEffect(() => {
    if (screen !== "count" || !activeTag) {
      return;
    }
    let cancelled = false;
    void snapshotQueue().then((queue) => {
      if (cancelled) {
        return;
      }
      setTagUnknowns(
        queue.unknowns.filter((row) => row.tag_id === activeTag.id && row.pass === activeTag.pass),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [screen, activeTag, pending]);

  // pending busts the cache after submit / sync so Denah reflects finished lorong.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- pending is a deliberate refresh token
  const progress = useMemo(() => (sessionId ? loadProgress(sessionId) : []), [sessionId, pending]);

  const reusedAisleProgress = useMemo(() => {
    if (!activeTag || !prepare) {
      return null;
    }
    return progressForSameUser(progress, activeTag.id, activeTag.pass, prepare.counter.id);
  }, [activeTag, prepare, progress]);

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

  async function openTag(nomor: string, pass?: number, paperNomor?: string) {
    if (!prepare) {
      return;
    }
    const tag = locatePrepareTagByNomor(prepare, nomor);
    if (!tag) {
      setMessage(`Posisi ${nomor} tidak ada di denah sesi ini.`);
      return;
    }
    const assignment = latestAssignment(prepare, tag.id, pass);
    if (!assignment) {
      setMessage("Posisi ini bukan tugas Anda.");
      return;
    }
    const fromPass1 =
      assignment.pass === 2
        ? pass1NomorKartu(tag.id, {
            preferred: assignment.pass1_nomor_kartu,
            local: progress,
            server: prepare.tag_progress,
          })
        : "";
    const paper = paperNomor?.trim() || fromPass1;
    setActiveTag({
      id: tag.id,
      nomor: tag.nomor,
      lokasi: tag.lokasi,
      pass: assignment.pass,
      pass1: assignment.pass === 2 ? assignment.pass1 : undefined,
      pass1_nomor_kartu: assignment.pass === 2 ? fromPass1 || null : undefined,
      compare: assignment.pass === 3 ? assignment.compare : undefined,
    });
    setLines(await linesForTag(tag.id, assignment.pass));
    setCode("");
    setSelectedId(null);
    setCardNo(paper);
    setQty("");
    setFocusField("qty");
    setPass2EditId(null);
    setPass2EditQty("");
    setPass2EditNama("");
    setPass2ReplaceFor(null);
    setTagEditOpen(false);
    setEmptyConfirm(false);
    setSelesaiConfirm(false);
    setLeaveTarget(null);
    closeUnknownForm();
    setMessage("");
    setPendingAisle(null);
    setTagNomor("");
    setScreen("count");
  }

  function requestLeaveCount(target: "home" | "sync") {
    if (screen === "count" || screen === "search") {
      setLeaveTarget(target);
      return;
    }
    setScreen(target);
  }

  function pickPlace(nomor: string, pass: number, lokasi: string) {
    // Same counter who already marked Lorong Selesai/Kosong on this phone may reopen without paper.
    const prior = prepare ? sameUserProgressForNomor(prepare, progress, nomor, pass) : null;
    if (prior) {
      void openTag(nomor, pass, prior.nomor_kartu ?? "");
      return;
    }
    // Petugas 2 only corrects Hitung ke-1; nomor tag comes from petugas 1 (no Input Nomor Tag screen).
    if (pass === 2) {
      void openTag(nomor, pass);
      return;
    }
    setPendingAisle({ nomor, pass, lokasi });
    setTagNomor("");
    setMessage("");
    setScreen("confirm-aisle");
  }

  async function confirmAisleAndOpen() {
    if (!pendingAisle) {
      return;
    }
    const typed = tagNomor.trim();
    if (!typed) {
      setMessage("Ketik nomor tag Anda.");
      return;
    }
    // Nomor tag is typed per lorong and stored as nomor_kartu; it is not the floor place label.
    await openTag(pendingAisle.nomor, pendingAisle.pass, typed);
  }

  function readCard(): { nomor: string | null } | null {
    if (!activeTag) {
      return null;
    }
    const nomor = cardNo.trim();
    if (nomor) {
      return { nomor };
    }
    if (reusedAisleProgress) {
      return { nomor: reusedAisleProgress.nomor_kartu };
    }
    if (activeTag.pass === 2) {
      const fromPass1 = pass1NomorKartu(activeTag.id, {
        preferred: activeTag.pass1_nomor_kartu,
        local: progress,
        server: prepare?.tag_progress,
      });
      if (fromPass1) {
        return { nomor: fromPass1 };
      }
      setMessage("Nomor tag Hitung ke-1 belum ada. Tekan Ubah untuk mengisi, atau minta petugas 1 sinkron lalu unduh ulang.");
      setTagEditOpen(true);
      return null;
    }
    if (isFloorPlace(activeTag.nomor)) {
      setMessage("Isi nomor tag.");
      return null;
    }
    return { nomor: null };
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
      setMessage("Nomor tag ini sudah Anda pakai di HP ini.");
      return;
    }
    const key = lineKey(activeTag.id, activeTag.pass, matched.id, DEFAULT_KONDISI);
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
      kondisi: DEFAULT_KONDISI,
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
      kondisi: DEFAULT_KONDISI,
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

  async function savePass2Review(
    item: Pass2Item,
    status: "sesuai" | "revisi",
    nextQty: string,
    namaRevisi?: string,
    replacement?: PreparePayload["items"][number],
  ) {
    if (!prepare || !activeTag || activeTag.pass !== 2) {
      return;
    }
    const card = readCard();
    if (!card) {
      return;
    }
    const catalog = replacement ?? prepare.items.find((row) => row.id === item.snapshot_item_id);
    if (!catalog) {
      setMessage("Barang tidak ditemukan di katalog sesi.");
      return;
    }
    const noteParts = [
      namaRevisi?.trim() ? `nama:${namaRevisi.trim().toUpperCase()}` : null,
      replacement && replacement.id !== item.snapshot_item_id ? `dari:${item.snapshot_item_id}` : null,
    ].filter(Boolean);
    const qtyNote = noteParts.length > 0 ? noteParts.join("|") : null;
    const key = lineKey(activeTag.id, activeTag.pass, catalog.id, DEFAULT_KONDISI);
    await enqueueCount({
      client_row_id: newClientRowId(),
      tag_id: activeTag.id,
      pass: activeTag.pass,
      snapshot_item_id: catalog.id,
      qty: nextQty,
      qty_note: qtyNote,
      kondisi: DEFAULT_KONDISI,
      nomor_kartu: card.nomor,
      client_created_at: new Date().toISOString(),
    });
    await upsertLine({
      key,
      tag_id: activeTag.id,
      pass: activeTag.pass,
      snapshot_item_id: catalog.id,
      barcode_4: catalog.barcode_4,
      nama_barang: namaRevisi?.trim() ? namaRevisi.trim().toUpperCase() : catalog.nama_barang,
      qty: nextQty,
      kondisi: DEFAULT_KONDISI,
      qty_note: qtyNote,
      nomor_kartu: card.nomor,
      review_status: status,
      pass1_snapshot_item_id: item.snapshot_item_id,
    });
    setLines(await linesForTag(activeTag.id, activeTag.pass));
    await refreshPending();
    setPass2EditId(null);
    setPass2EditQty("");
    setPass2EditNama("");
    setPass2ReplaceFor(null);
    setMessage(status === "sesuai" ? "Ditandai Stock Sesuai." : "Revisi Hitung ke-2 disimpan.");
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
    upsertProgress(sessionId, {
      tag_id: activeTag.id,
      pass: activeTag.pass,
      nomor_kartu: card.nomor,
      is_empty: isEmpty,
      user_id: prepare?.counter.id,
      user_nama: prepare?.counter.nama,
    });
    await refreshPending();
    setEmptyConfirm(false);
    setSelesaiConfirm(false);
    setTagNomor("");
    setCardNo("");
    setScreen("home");
    setMessage(
      isEmpty
        ? `Lorong ${activeTag.nomor} ditandai kosong. Sinkronkan agar denah dan Pantau koordinator ikut berubah.`
        : `Lorong ${activeTag.nomor} selesai. Sinkronkan agar denah dan Pantau koordinator ikut berubah.`,
    );
  }

  async function saveUnknown() {
    if (!activeTag || !unknownNama || !unknownQty) {
      setMessage("Isi nama dan jumlah.");
      return;
    }
    const existing = editingUnknownId
      ? tagUnknowns.find((row) => row.client_row_id === editingUnknownId)
      : null;
    await enqueueUnknown({
      client_row_id: editingUnknownId ?? newClientRowId(),
      tag_id: activeTag.id,
      pass: activeTag.pass,
      kode_input: (code || existing?.kode_input || null)?.toUpperCase() ?? null,
      nama_input: unknownNama.trim().toUpperCase(),
      qty: unknownQty,
      kondisi: DEFAULT_KONDISI,
      client_created_at: existing?.client_created_at ?? new Date().toISOString(),
    });
    await refreshPending();
    closeUnknownForm();
    setMessage(existing ? "Barang tidak dikenal diperbarui." : "Dicatat sebagai tidak dikenal.");
  }

  const aisleRecords = useMemo(
    () => (prepare ? buildAisleRecords(prepare, doneLines, progress) : []),
    [doneLines, prepare, progress],
  );

  const pass2Items: Pass2Item[] = useMemo(() => {
    if (!activeTag?.pass1) {
      return [];
    }
    return activeTag.pass1.map((row) => {
      const line = lines.find(
        (item) =>
          item.snapshot_item_id === row.snapshot_item_id || item.pass1_snapshot_item_id === row.snapshot_item_id,
      );
      const namaRevisi = line?.qty_note
        ?.split("|")
        .find((part) => part.startsWith("nama:"))
        ?.slice(5);
      return {
        snapshot_item_id: row.snapshot_item_id,
        barcode_4: row.barcode_4,
        nama_barang: row.nama_barang,
        qty_1: row.qty_1,
        review_status: line?.review_status,
        qty_2: line?.qty,
        nama_revisi: namaRevisi ?? null,
      };
    });
  }, [activeTag?.pass1, lines]);

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
      pending={pendingItems}
      dark={screen === "count" || screen === "search"}
      locked={screen === "prepare"}
      onSync={() => {
        if (syncBusy) {
          return;
        }
        requestLeaveCount("sync");
      }}
      onHome={() => requestLeaveCount("home")}
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
          {busy
            ? "Sedang mengikat nama. Tunggu sebentar."
            : online
              ? "Tarik ke bawah untuk memperbarui"
              : "Tidak ada internet. Perbarui daftar saat ada sinyal."}
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
    const finishedLorong = progress.length;
    const isPass2Home = isPass2OnlyCounter(prepare);
    return (
      <Phone>
        <PrefetchDeveloperCredit />
        {bar}
        <h1 className="sr-only">Beranda</h1>
        <p className="text-xs tracking-wide text-[#8a8a8a] uppercase">
          {prepare?.session.nama ?? "Sesi"} · {prepare?.session.periode ?? "—"}
        </p>
        <p className="mt-2 text-3xl font-semibold leading-tight tracking-tight">
          Halo, {prepare?.counter.nama?.split(/\s+/)[0] ?? "Petugas"}
        </p>
        <p className="mt-2 text-sm leading-6 text-[#5c5c5c]">
          {isPass2Home
            ? "Pilih lorong di denah, lalu cek ulang hasil Hitung ke-1. Kirim lewat Data di kanan atas saat ada sinyal."
            : "Pilih lorong di denah, isi nomor tag, lalu catat barang. Kirim lewat Data di kanan atas saat ada sinyal."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
            <p className="text-[11px] tracking-wide text-[#8a8a8a] uppercase">Belum kirim</p>
            <p className="mt-1 text-3xl font-semibold text-ksa-teal-deep">{pendingItems}</p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
            <p className="text-[11px] tracking-wide text-[#8a8a8a] uppercase">Lorong selesai</p>
            <p className="mt-1 text-3xl font-semibold">{finishedLorong}</p>
          </div>
        </div>

        <ol className="mt-6 space-y-3 text-sm text-[#5c5c5c]">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ksa-teal text-xs font-semibold text-white">
              1
            </span>
            <span className="pt-1">Buka denah dan pilih lorong tugas Anda</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ksa-teal text-xs font-semibold text-white">
              2
            </span>
            <span className="pt-1">
              {isPass2Home
                ? "Cek setiap barang: Sesuai atau Tidak Sesuai"
                : "Ketik nomor tag, lalu mulai hitung"}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ksa-teal text-xs font-semibold text-white">
              3
            </span>
            <span className="pt-1">
              {isPass2Home ? "Tutup lorong, lalu sinkronkan" : "Simpan barang, tutup lorong, sinkronkan"}
            </span>
          </li>
        </ol>

        <div className="mt-auto pt-8">
          <button
            type="button"
            className="w-full rounded-[28px] bg-ksa-teal px-5 py-7 text-left text-white shadow-sm transition active:scale-[0.99]"
            onClick={() => {
              setTagNomor("");
              setMessage("");
              setScreen("denah");
            }}
          >
            <p className="text-xl font-semibold">Buka Denah</p>
            <p className="mt-1 text-sm text-white/80">
              {isPass2Home ? "Pilih lorong untuk cek ulang" : "Pilih lorong, lalu isi nomor tag"}
            </p>
          </button>
        </div>

        {message ? <p className="mt-4 text-sm">{message}</p> : null}
        <div className="h-20 shrink-0" />
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
          <div className="mx-auto flex w-full max-w-[390px] items-center justify-between px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              aria-label="Info"
              className={edgeIcon}
              onClick={() => setScreen("about")}
            >
              <span className="text-lg font-semibold leading-none">i</span>
              <span className="text-[10px] font-medium leading-none">Info</span>
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
              <LuDoorOpen size={20} />
              <span className="text-[10px] font-medium leading-none">Keluar</span>
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

  if (screen === "confirm-aisle") {
    return (
      <Phone>
        <BackButton
          className="mb-3"
          onClick={() => {
            setPendingAisle(null);
            setMessage("");
            setScreen("denah");
          }}
        />
        {bar}
        <h1 className="text-2xl font-semibold">Nomor Tag</h1>
        <p className="mt-2 text-sm text-[#6b6b6b]">
          Sebelum mulai hitung, ketik nomor tag untuk posisi ini. Satu lorong memakai satu nomor tag.
        </p>
        {pendingAisle ? (
          <div className="mt-5 rounded-2xl bg-white px-4 py-4 shadow-sm">
            <AisleMeta nomor={pendingAisle.nomor} lokasi={pendingAisle.lokasi} pass={pendingAisle.pass} />
          </div>
        ) : null}
        <PaperNumberField value={tagNomor} onChange={setTagNomor} />
        <ActionColumn>
          <PrimaryButton disabled={!tagNomor.trim()} onClick={() => void confirmAisleAndOpen()}>
            Mulai Hitung
          </PrimaryButton>
        </ActionColumn>
        {message ? <MessageOverlay message={message} onClose={() => setMessage("")} /> : null}
      </Phone>
    );
  }

  if (screen === "denah") {
    return (
      <Phone>
        <BackButton className="mb-3" onClick={() => setScreen("home")} />
        {bar}
        <h1 className="text-2xl font-semibold">Pilih dari Denah</h1>
        <p className="mt-1 text-sm text-[#6b6b6b]">
          Huruf di atas, nomor di kiri. Kotak hitam: inisial Hitung ke-1 / ke-2 dan nomor tag setelah sinkron.
        </p>
        {prepare ? (
          <PhoneDenah
            prepare={prepare}
            progress={progress}
            onPick={(tag, pass) => pickPlace(tag.nomor, pass, tag.lokasi)}
          />
        ) : null}
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
                  if (pass2EditId) {
                    setPass2ReplaceFor(item.id);
                    setPass2EditNama(item.nama_barang.toUpperCase());
                    setSearch("");
                    setScreen("count");
                    return;
                  }
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

  if (screen === "sync") {
    return (
      <Phone tone="sync">
        <BackButton
          className="mb-3"
          onClick={() => {
            if (syncBusy) {
              return;
            }
            setExitBlock(false);
            setScreen("home");
          }}
        />
        {bar}
        <h1 className="text-2xl font-semibold">Data hitung</h1>
        <div className="mt-5 rounded-[28px] bg-[#f3e2b0] px-5 py-8 text-center">
          <p className="text-5xl font-semibold">{pendingItems}</p>
          <p className="mt-2 text-sm">barang belum terkirim</p>
          {pendingClosures > 0 ? (
            <p className="mt-2 text-sm text-[#6b6b6b]">
              + {pendingClosures} penutupan lorong siap dikirim
            </p>
          ) : null}
        </div>
        {exitBlock && pending > 0 ? (
          <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm">
            Masih ada data belum terkirim. Jangan tinggalkan gudang sebelum angka ini nol. Cari area bersinyal, lalu
            tekan Kirim Sekarang.
          </p>
        ) : null}
        {rejected.map((row) => (
          <p key={row.client_row_id} className="mt-2 text-sm text-red-800">
            {row.reason}
          </p>
        ))}
        <div className="mt-4">
          <PrimaryButton disabled={Boolean(syncBusy)} onClick={() => void syncNow(false)}>
            Kirim Sekarang
          </PrimaryButton>
        </div>
        <p className="mt-2 text-xs text-[#8a8a8a]">
          Saat kirim, HP juga mengunduh Excel cadangan dari data di perangkat ini.
        </p>
        {syncBusy ? <SyncBusyOverlay label={syncBusy.label} percent={syncBusy.percent} /> : null}
        <h2 className="mt-6 text-sm font-medium text-[#6b6b6b]">Lorong & nomor tag ({aisleRecords.length})</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {aisleRecords.length === 0 ? (
            <li className="rounded-2xl bg-white px-4 py-3 text-sm text-[#6b6b6b]">Belum ada lorong yang dicatat.</li>
          ) : (
            aisleRecords.map((row) => (
              <li key={`${row.tag_id}-${row.pass}`} className="rounded-2xl bg-white px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">Lorong {row.nomor}</p>
                    <p className="mt-0.5 text-xs text-[#8a8a8a]">{row.lokasi}</p>
                  </div>
                  <PassBadge pass={row.pass} />
                </div>
                <p className="mt-2 text-sm">
                  Nomor tag: <span className="font-semibold">{row.nomor_kartu || "—"}</span>
                </p>
                <p className="mt-1 text-xs text-[#8a8a8a]">
                  {row.is_empty ? "Ditandai kosong" : `${row.items} barang dicatat`}
                </p>
              </li>
            ))
          )}
        </ul>
        <h2 className="mt-6 text-sm font-medium text-[#6b6b6b]">Barang ({doneLines.length})</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {doneLines.map((line) => (
            <QtyRow key={line.key} label={line.nama_barang} qty={line.qty} />
          ))}
        </ul>
        <h2 className="mt-6 text-sm font-medium text-[#6b6b6b]">
          Barang tidak dikenal ({doneUnknowns.length})
        </h2>
        <UnknownRowsList rows={doneUnknowns} />
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
            <dd className="mt-1 text-base">{pendingItems}</dd>
          </div>
        </dl>
        <DeveloperCredit onOpen={() => setCreditOpen(true)} />
        {creditOpen ? <DeveloperCreditDialog onClose={() => setCreditOpen(false)} /> : null}
      </Phone>
    );
  }

  function resetUnknownForm() {
    setEditingUnknownId(null);
    setUnknownNama("");
    setUnknownQty("");
  }

  function closeUnknownForm() {
    resetUnknownForm();
    setUnknownOpen(false);
  }

  function openUnknownForm() {
    resetUnknownForm();
    setUnknownOpen(true);
  }

  function editUnknown(row: UnknownRow) {
    setEditingUnknownId(row.client_row_id);
    setUnknownNama((row.nama_input ?? "").toUpperCase());
    setUnknownQty(row.qty);
    setCode((row.kode_input ?? "").toUpperCase());
    setUnknownOpen(true);
  }

  const isPass2 = activeTag?.pass === 2;
  const pass1Card = activeTag
    ? pass1NomorKartu(activeTag.id, {
        preferred: activeTag.pass1_nomor_kartu,
        local: progress,
        server: prepare?.tag_progress,
      })
    : "";

  return (
    <Phone tone="ink">
      <BackButton light className="mb-3" onClick={() => setLeaveTarget("home")} />
      {bar}
      {activeTag ? (
        <AisleMeta nomor={activeTag.nomor} lokasi={activeTag.lokasi} pass={activeTag.pass} tone="ink" />
      ) : null}
      {activeTag ? <PassAckNote pass={activeTag.pass} /> : null}
      <p className="mt-3 text-base font-medium text-white/70">
        {isPass2
          ? "Cek setiap barang Hitung ke-1: Sesuai atau Tidak Sesuai."
          : "Cari barang, isi jumlah, lalu simpan."}
      </p>
      {isPass2 ? (
        <Pass2TagEditor
          pass1Card={pass1Card}
          cardNo={cardNo}
          editing={tagEditOpen}
          onChangeCard={setCardNo}
          onToggleEdit={setTagEditOpen}
        />
      ) : activeTag && isFloorPlace(activeTag.nomor) && !reusedAisleProgress ? (
        <label className="mt-4 block text-sm">
          <span className="text-white/70">Nomor tag</span>
          <PaperNumberField tone="ink" autoFocus={false} value={cardNo} onChange={setCardNo} />
        </label>
      ) : null}
      {reusedAisleProgress?.nomor_kartu && !isPass2 ? (
        <p className="mt-4 text-sm text-white/50">
          Nomor tag: <span className="font-medium text-white/80">{reusedAisleProgress.nomor_kartu}</span>
        </p>
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
      {isPass2 ? (
        <Pass2ReviewList
          items={pass2Items}
          editingId={pass2EditId}
          editQty={pass2EditQty}
          editNama={pass2EditNama}
          onEditQty={setPass2EditQty}
          onEditNama={setPass2EditNama}
          onStartRevisi={(item) => {
            setPass2EditId(item.snapshot_item_id);
            setPass2EditQty(item.qty_2 || item.qty_1);
            setPass2EditNama(item.nama_revisi || "");
            setPass2ReplaceFor(null);
          }}
          onCancelRevisi={() => {
            setPass2EditId(null);
            setPass2EditQty("");
            setPass2EditNama("");
            setPass2ReplaceFor(null);
          }}
          onSesuai={(item) => void savePass2Review(item, "sesuai", item.qty_1)}
          onSaveRevisi={(item) => {
            const replacement =
              pass2ReplaceFor && prepare
                ? prepare.items.find((row) => row.id === pass2ReplaceFor)
                : undefined;
            void savePass2Review(item, "revisi", pass2EditQty.trim(), pass2EditNama, replacement);
          }}
          onGantiBarang={(item) => {
            setPass2EditId(item.snapshot_item_id);
            setPass2ReplaceFor(null);
            setScreen("search");
          }}
        />
      ) : (
        <>
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
          <div className="mt-4">
            <NumericKeypad onDigit={onDigit} onBack={onBack} />
          </div>
          <div className="mt-4">
            <PrimaryButton disabled={!matched || !qty} onClick={() => void saveLine(qty)}>
              Simpan Barang
            </PrimaryButton>
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded-full border border-ksa-amber bg-ksa-amber/20 py-3 text-sm font-semibold text-ksa-amber"
            onClick={openUnknownForm}
          >
            Tidak dikenal
          </button>
          {!matched && code.length >= 4 ? (
            <p className="mt-3 text-sm text-ksa-amber">
              Kode {code} tidak ditemukan.{" "}
              <button type="button" className="underline" onClick={openUnknownForm}>
                Catat sebagai Tidak Dikenal
              </button>
            </p>
          ) : null}
          <section className="mt-5">
            <h2 className="mb-2 text-sm text-white/50">Sudah dicatat di lorong ini ({lines.length} barang)</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {lines.map((line) => (
                <QtyRow
                  key={line.key}
                  tone="ink"
                  label={line.nama_barang}
                  qty={line.qty}
                  onEdit={() => {
                    setSelectedId(line.snapshot_item_id);
                    setCode(line.barcode_4 ?? "");
                    setQty(line.qty);
                    setFocusField("qty");
                  }}
                />
              ))}
            </ul>
            <h2 className="mb-2 mt-4 text-sm text-white/50">Tidak dikenal ({tagUnknowns.length})</h2>
            {tagUnknowns.length > 0 ? (
              <UnknownRowsList rows={tagUnknowns} tone="ink" onEdit={editUnknown} />
            ) : null}
          </section>
        </>
      )}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-full border border-white/30 py-3 text-sm"
          onClick={() => setSelesaiConfirm(true)}
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
      <button type="button" className="mt-3 text-sm text-white/50" onClick={() => setLeaveTarget("home")}>
        Tutup lorong
      </button>
      {selesaiConfirm ? (
        <ConfirmOverlay
          title={`Selesaikan lorong ${activeTag?.nomor}?`}
          body={
            isPass2
              ? `${pass2Items.filter((row) => row.review_status).length} dari ${pass2Items.length} barang sudah dicek. Setelah selesai, lorong ditutup untuk Hitung ke-2.`
              : `${lines.length} barang sudah dicatat. Setelah selesai, lorong ini ditutup untuk hitung ini.`
          }
          confirmLabel="Ya, selesai"
          onCancel={() => setSelesaiConfirm(false)}
          onConfirm={() => void submitTag(false)}
        />
      ) : null}
      {emptyConfirm ? (
        <ConfirmOverlay
          title={`Tandai lorong ${activeTag?.nomor} sebagai kosong?`}
          body="Artinya Anda sudah mengecek dan tidak ada barang di area ini."
          confirmLabel="Ya, kosong"
          onCancel={() => setEmptyConfirm(false)}
          onConfirm={() => void submitTag(true)}
        />
      ) : null}
      {leaveTarget ? (
        <ConfirmOverlay
          title={leaveTarget === "sync" ? "Buka data hitung?" : `Tutup lorong ${activeTag?.nomor}?`}
          body={
            leaveTarget === "sync"
              ? "Barang yang sudah disimpan tetap di HP. Anda bisa kembali ke lorong ini dari denah."
              : "Barang yang sudah disimpan tetap di HP. Anda bisa membuka lorong ini lagi nanti."
          }
          confirmLabel={leaveTarget === "sync" ? "Ya, buka data" : "Ya, tutup"}
          onCancel={() => setLeaveTarget(null)}
          onConfirm={() => {
            const target = leaveTarget;
            setLeaveTarget(null);
            setTagNomor("");
            setScreen(target);
          }}
        />
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
            <TextLink onClick={() => setDuplicate(null)}>Batal</TextLink>
          </div>
        </Overlay>
      ) : null}
      {unknownOpen ? (
        <UnknownItemOverlay
          nama={unknownNama}
          qty={unknownQty}
          onNama={setUnknownNama}
          onQty={setUnknownQty}
          onSave={() => void saveUnknown()}
          onCancel={closeUnknownForm}
        />
      ) : null}
      {message ? <p className="mt-3 text-sm text-ksa-amber">{message}</p> : null}
    </Phone>
  );
}
