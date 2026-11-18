"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson } from "@/app/siap/api";
import { SAMPLE_DENAH_NOTE } from "@/lib/monitor";
import { MissingList, TealButton } from "@/app/siap/ui";

type Detail = {
  id: string;
  nama: string;
  periode: string;
  status: string;
  snapshot_items: number;
  session_tags: number;
  missing_assignments: string[];
  scope_filter: { brands?: string[]; groups?: string[] };
};

type GudangProgress = {
  nama: string;
  selesai: number;
  total: number;
  selisih_hitung: number;
};

type DenahPayload = {
  gudang: GudangProgress[];
  pinned: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  counting: "Sedang berjalan",
  review: "Penelaahan",
  approved: "Disetujui",
  closed: "Ditutup",
};

async function fetchSession(id: string) {
  const { ok, data } = await fetchJson<Detail>(`/api/sessions/${id}`);
  return ok ? data : null;
}

export function SesiDetail({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [gudang, setGudang] = useState<GudangProgress[]>([]);
  const [pinned, setPinned] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchSession(id).then((next) => {
      if (!cancelled && next) {
        setDetail(next);
      }
    });
    void fetchJson<DenahPayload>(`/api/sessions/${id}/denah`).then(({ ok, data }) => {
      if (!cancelled && ok) {
        setGudang(data.gudang);
        setPinned(data.pinned);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function openSession() {
    setMessage("");
    const { ok, data } = await fetchJson<{ error?: string; missing_assignments?: string[] }>(`/api/sessions/${id}/open`, {
      method: "POST",
    });
    if (!ok) {
      setMessage(data.error ?? "Belum bisa dibuka.");
      if (data.missing_assignments) {
        setDetail((current) => (current ? { ...current, missing_assignments: data.missing_assignments ?? [] } : current));
      }
      return;
    }
    const next = await fetchSession(id);
    if (next) {
      setDetail(next);
    }
    setMessage("Sesi dibuka. session_tags sudah dipin.");
  }

  if (!detail) {
    return <p>Memuat…</p>;
  }

  const scope = detail.scope_filter;
  const selesai = gudang.reduce((sum, row) => sum + row.selesai, 0);
  const total = gudang.reduce((sum, row) => sum + row.total, 0);
  const selisih = gudang.reduce((sum, row) => sum + row.selisih_hitung, 0);
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{detail.nama}</h1>
          <p className="mt-1 text-sm text-[#6b6b6b]">
            {detail.periode} · {(scope.brands ?? []).join(", ")} · {(scope.groups ?? []).join(", ")}
          </p>
        </div>
        <span className="rounded-full bg-[#f3e2b0] px-3 py-1 text-sm">{STATUS_LABEL[detail.status] ?? detail.status}</span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Barang di snapshot" value={String(detail.snapshot_items)} href={`/siap/${id}/laporan/daftar-barang`} />
        <Stat label="Tag di pin" value={String(detail.session_tags || total)} href={`/siap/${id}/pantau`} />
        <Stat label="Selesai" value={String(selesai)} href={`/siap/${id}/pantau`} />
        <Stat label="Selisih hitung" value={String(selisih)} href={`/siap/${id}/laporan/selisih-hitung`} />
      </div>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-medium">Pantauan per gudang</h2>
          <Link href={`/siap/${id}/pantau`} className="text-sm text-ksa-teal-deep">
            Buka denah
          </Link>
        </div>
        {gudang.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b6b6b]">Denah muncul setelah sesi dibuka.</p>
        ) : (
          <>
            {pinned ? null : <p className="mt-3 text-sm text-[#6b6b6b]">{SAMPLE_DENAH_NOTE}</p>}
          <ul className="mt-4 space-y-4">
            {gudang.map((row) => {
              const width = row.total === 0 ? 0 : Math.round((row.selesai / row.total) * 100);
              return (
                <li key={row.nama}>
                  <div className="flex justify-between text-sm">
                    <span>{row.nama}</span>
                    <span className="text-[#6b6b6b]">
                      {row.selesai}/{row.total}
                      {row.selisih_hitung > 0 ? ` · ${row.selisih_hitung} selisih` : ""}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#efe8da]">
                    <div className="h-full rounded-full bg-ksa-teal" style={{ width: `${width}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          </>
        )}
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link href={`/siap/${id}/impor`} className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="font-medium">Impor</p>
          <p className="mt-1 text-sm text-[#6b6b6b]">{detail.snapshot_items} barang</p>
        </Link>
        <Link href={`/siap/${id}/tugas`} className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="font-medium">Bagi tugas</p>
          <p className="mt-1 text-sm text-[#6b6b6b]">
            {detail.missing_assignments.length === 0 ? "Semua tag terisi" : `${detail.missing_assignments.length} belum lengkap`}
          </p>
        </Link>
        <Link href={`/siap/${id}/persetujuan`} className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="font-medium">Persetujuan</p>
          <p className="mt-1 text-sm text-[#6b6b6b]">Penelaahan dan ekspor</p>
        </Link>
      </div>

      <MissingList items={detail.missing_assignments} />
      {message ? <p className="mt-4 text-sm">{message}</p> : null}
      <TealButton className="mt-6 px-6 py-3" disabled={detail.status !== "draft"} onClick={() => void openSession()}>
        Buka sesi
      </TealButton>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-[#6b6b6b]">{label}</p>
    </Link>
  );
}
