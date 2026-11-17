"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson } from "@/app/siap/api";
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

async function fetchSession(id: string) {
  const { ok, data } = await fetchJson<Detail>(`/api/sessions/${id}`);
  return ok ? data : null;
}

export function SesiDetail({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchSession(id).then((next) => {
      if (!cancelled && next) {
        setDetail(next);
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
  return (
    <>
      <p className="text-sm text-[#6b6b6b]">{detail.periode}</p>
      <h1 className="text-2xl font-semibold">{detail.nama}</h1>
      <p className="mt-1 text-sm">
        Status: <span className="font-medium">{detail.status}</span>
      </p>
      <p className="mt-2 text-sm text-[#6b6b6b]">
        Lingkup: {(scope.brands ?? []).join(", ")} · {(scope.groups ?? []).join(", ")}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href={`/siap/${id}/impor`} className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="font-medium">Impor snapshot</p>
          <p className="mt-1 text-sm text-[#6b6b6b]">{detail.snapshot_items} barang</p>
        </Link>
        <Link href={`/siap/${id}/tugas`} className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="font-medium">Bagi tugas</p>
          <p className="mt-1 text-sm text-[#6b6b6b]">
            {detail.missing_assignments.length === 0 ? "Semua tag terisi" : `${detail.missing_assignments.length} belum lengkap`}
          </p>
        </Link>
        <Link href={`/siap/${id}/pantau`} className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="font-medium">Pantau gudang</p>
          <p className="mt-1 text-sm text-[#6b6b6b]">{detail.session_tags} tag di sesi ini</p>
        </Link>
        <Link href={`/siap/${id}/petugas`} className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="font-medium">Status petugas</p>
          <p className="mt-1 text-sm text-[#6b6b6b]">Sinkron terakhir dan laporan HP</p>
        </Link>
        <Link href={`/siap/${id}/laporan`} className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="font-medium">Laporan</p>
          <p className="mt-1 text-sm text-[#6b6b6b]">Selisih, daftar, dan peta barang</p>
        </Link>
        <Link href={`/siap/${id}/persetujuan`} className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="font-medium">Persetujuan</p>
          <p className="mt-1 text-sm text-[#6b6b6b]">Penelaahan, ekspor, dan buka ulang</p>
        </Link>
      </div>
      <MissingList items={detail.missing_assignments} />
      {message ? <p className="mt-4 text-sm">{message}</p> : null}
      <TealButton className="mt-6 px-6 py-3" disabled={detail.status !== "draft"} onClick={() => void openSession()}>
        Buka sesi
      </TealButton>
    </>
  );
}
