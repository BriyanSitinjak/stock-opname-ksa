"use client";

import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Clock,
  FileUp,
  Map,
  Package,
  Scale,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { fetchJson } from "@/app/siap/api";
import { siapKey, useSiapInvalidate, useSiapQuery, useSiapQueryClient } from "@/app/siap/query";
import { SAMPLE_DENAH_NOTE } from "@/lib/tag-status";
import { LoadingMark } from "@/app/loading-mark";
import { formatDateTime, type SessionScope } from "@/app/siap/format";
import { IconLabel, InfoCard, MissingList, ScopeLists, TealButton } from "@/app/siap/ui";
import { toast } from "@/app/toast";

type Detail = {
  id: string;
  nama: string;
  periode: string;
  status: string;
  snapshot_items: number;
  session_tags: number;
  missing_assignments: string[];
  scope: SessionScope;
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
  draft: "Draft",
  counting: "Counting",
  review: "Review",
  approved: "Approved",
  closed: "Closed",
};

export function SesiDetail({ id }: { id: string }) {
  const invalidate = useSiapInvalidate();
  const queryClient = useSiapQueryClient();
  const session = useSiapQuery<Detail>(`/api/sessions/${id}`);
  const denah = useSiapQuery<DenahPayload>(`/api/sessions/${id}/denah`);
  const detail = session.data ?? null;
  const gudang = denah.data?.gudang ?? [];
  const pinned = denah.data?.pinned ?? true;

  async function openSession() {
    const { ok, data } = await fetchJson<{ error?: string; missing_assignments?: string[] }>(`/api/sessions/${id}/open`, {
      method: "POST",
    });
    if (!ok) {
      toast(data.error ?? "Belum bisa dibuka.");
      if (data.missing_assignments) {
        queryClient.setQueryData<Detail>(siapKey(`/api/sessions/${id}`), (current) =>
          current ? { ...current, missing_assignments: data.missing_assignments ?? [] } : current,
        );
      }
      return;
    }
    invalidate([`/api/sessions/${id}`, `/api/sessions/${id}/denah`, "/api/sessions"]);
    toast("Sesi dibuka. Tag sudah di-pin.");
  }

  if (session.isPending) {
    return <LoadingMark />;
  }
  if (!detail) {
    return <p className="text-sm">Sesi belum bisa dimuat.</p>;
  }

  const scope = detail.scope;
  const selesai = gudang.reduce((sum, row) => sum + row.selesai, 0);
  const total = gudang.reduce((sum, row) => sum + row.total, 0);
  const selisih = gudang.reduce((sum, row) => sum + row.selisih_hitung, 0);
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">{detail.nama}</h1>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard icon={CircleDot} title="Status">
          {STATUS_LABEL[detail.status] ?? detail.status}
        </InfoCard>
        <InfoCard icon={CalendarDays} title="Periode">
          {scope.periode}
        </InfoCard>
        <InfoCard icon={Clock} title="Cut off" className="sm:col-span-2">
          {formatDateTime(scope.snapshot_at)}
        </InfoCard>
        <ScopeLists included={scope.included} excluded={scope.excluded} groups={scope.groups} groupClassName="sm:col-span-2" />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Package} label="Item di snapshot" value={String(detail.snapshot_items)} href="/siap/daftar-barang" />
        <Stat icon={ClipboardList} label="Tag yang di-pin" value={String(detail.session_tags || total)} href={`/siap/${id}/pantau`} />
        <Stat icon={CheckCircle2} label="Selesai" value={String(selesai)} href={`/siap/${id}/pantau`} />
        <Stat icon={Scale} label="Selisih hitung" value={String(selisih)} href={`/siap/${id}/laporan/selisih-hitung`} />
      </div>

      <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between gap-3">
          <IconLabel as="h2" icon={Map} title="Progress per gudang" />
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
                    <span className="font-semibold">{row.nama}</span>
                    <span className="font-semibold">
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
        <Link href="/siap/impor">
          <InfoCard icon={FileUp} title="Impor">
            {detail.snapshot_items} item
          </InfoCard>
        </Link>
        <Link href={`/siap/${id}/tugas`}>
          <InfoCard icon={ClipboardList} title="Bagi tugas">
            {detail.missing_assignments.length === 0 ? "Semua tag terisi" : `${detail.missing_assignments.length} belum lengkap`}
          </InfoCard>
        </Link>
        <Link href={`/siap/${id}/persetujuan`}>
          <InfoCard icon={BadgeCheck} title="Persetujuan">
            Review dan export
          </InfoCard>
        </Link>
      </div>

      <MissingList items={detail.missing_assignments} />
      <div className="sticky bottom-0 z-10 -mx-4 mt-8 flex flex-wrap items-center gap-3 border-t border-[#e7dfd2] bg-ksa-cream/95 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <TealButton className="px-6 py-3" disabled={detail.status !== "draft"} onClick={() => void openSession()}>
          Buka sesi
        </TealButton>
        <Link
          href="/siap"
          className="inline-flex items-center gap-2 rounded-full border border-[#1c1c1c] bg-white px-5 py-3 text-sm font-medium text-[#1c1c1c]"
        >
          <ArrowLeft aria-hidden size={16} strokeWidth={2} />
          Kembali ke tampilan awal
        </Link>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, href }: { icon: LucideIcon; label: string; value: string; href: string }) {
  return (
    <Link href={href}>
      <InfoCard icon={icon} title={label}>
        <span className="text-3xl">{value}</span>
      </InfoCard>
    </Link>
  );
}
