"use client";

import Link from "next/link";
import { EmptyState } from "@/app/empty-state";
import { LoadingMark } from "@/app/loading-mark";
import { useSiapQuery } from "@/app/siap/query";
import { scrollListClass } from "@/app/siap/report-table";
import { SessionCard, type SessionCardData } from "@/app/siap/session-card";
import { ErrorText, PageLead } from "@/app/siap/ui";

export default function SiapPage() {
  const sessions = useSiapQuery<SessionCardData[]>("/api/sessions");
  if (sessions.isPending) {
    return <LoadingMark />;
  }
  const error = sessions.isError ? "Gagal memuat sesi." : "";
  const rows = sessions.data ?? [];

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
      {rows.length === 0 && !error ? <EmptyState menu="sesi" /> : null}
      <ul className={`flex flex-col gap-3 ${scrollListClass}`}>
        {rows.map((session) => (
          <li key={session.id}>
            <SessionCard session={session} href={`/siap/${session.id}`} />
          </li>
        ))}
      </ul>
    </>
  );
}
