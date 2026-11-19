"use client";

import { CalendarDays, ChevronRight, ClipboardList, Clock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/app/empty-state";
import { fetchJson } from "@/app/siap/api";
import { formatDateTime, stringList } from "@/app/siap/format";
import { scrollListClass } from "@/app/siap/report-table";
import { ErrorText, PageLead } from "@/app/siap/ui";

type SessionRow = {
  id: string;
  nama: string;
  periode: string;
  status: string;
  snapshotAt: string;
  scopeFilter: { brands?: unknown; groups?: unknown } | null;
};

export default function SiapPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchJson<SessionRow[]>("/api/sessions").then(({ ok, data }) => {
      if (cancelled) {
        return;
      }
      if (!ok) {
        setError("Gagal memuat sesi.");
        return;
      }
      setSessions(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Sesi opname</h1>
          <PageLead>
            Satu sesi memegang snapshot, tugas hitung, dan hasil yang nanti di-approve. Buka sesi yang sedang berjalan, atau buat sesi baru sebelum file cut off di-import.
          </PageLead>
        </div>
        <Link href="/siap/baru" className="rounded-full bg-ksa-teal px-5 py-2.5 text-sm font-medium text-white">
          Sesi baru
        </Link>
      </div>
      <ErrorText>{error}</ErrorText>
      {sessions.length === 0 && !error ? <EmptyState menu="sesi" /> : null}
      <ul className={`flex flex-col gap-3 ${scrollListClass}`}>
        {sessions.map((session) => {
          const brands = stringList(session.scopeFilter?.brands);
          const groups = stringList(session.scopeFilter?.groups);
          return (
            <li key={session.id}>
              <Link
                href={`/siap/${session.id}`}
                className="group flex items-center gap-4 rounded-3xl border border-[#e7dfd2] bg-white p-4 shadow-sm transition-[border-color,box-shadow] duration-150 hover:border-ksa-teal hover:shadow-md sm:p-5"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ksa-sage text-ksa-teal-deep">
                  <ClipboardList aria-hidden size={22} strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold">{session.nama}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${STATUS_TONE[session.status] ?? "bg-[#ece7df] text-[#6b6b6b]"}`}>
                      {session.status}
                    </span>
                  </span>
                  <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#6b6b6b]">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays aria-hidden size={14} strokeWidth={2} />
                      {session.periode}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock aria-hidden size={14} strokeWidth={2} />
                      {formatDateTime(session.snapshotAt)}
                    </span>
                  </span>
                  <span className="mt-3 flex flex-wrap gap-2">
                    <ChipRow label="Brand" items={brands} tone="bg-ksa-sage text-ksa-teal-deep" />
                    <ChipRow label="Group" items={groups} tone="bg-[#f6f1e8] text-[#1c1c1c]" />
                  </span>
                </span>
                <ChevronRight aria-hidden size={20} strokeWidth={2} className="shrink-0 text-ksa-teal-deep transition-transform duration-150 group-hover:translate-x-1" />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

const STATUS_TONE: Record<string, string> = {
  draft: "bg-[#f3e2b0] text-[#6a5210]",
  counting: "bg-ksa-sage text-ksa-teal-deep",
  review: "bg-[#f3d4a0] text-[#6a5210]",
  approved: "bg-ksa-teal text-white",
  closed: "bg-[#ece7df] text-[#6b6b6b]",
};

function ChipRow({ label, items, tone }: { label: string; items: string[]; tone: string }) {
  if (items.length === 0) {
    return null;
  }
  const shown = items.slice(0, 3);
  const extra = items.length - shown.length;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-[#6b6b6b]">{label}</span>
      {shown.map((item) => (
        <span key={item} className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
          {item}
        </span>
      ))}
      {extra > 0 ? <span className="text-xs font-semibold text-ksa-teal-deep">+{extra}</span> : null}
    </span>
  );
}
