"use client";

import { EmptyState } from "@/app/empty-state";
import { LoadingMark } from "@/app/loading-mark";
import { useSiapQuery } from "@/app/siap/query";
import { scrollListClass } from "@/app/siap/report-table";
import { SessionCard, type SessionCardData } from "@/app/siap/session-card";
import { sessionMenu } from "@/app/siap/session-menus";
import { ErrorText, PageLead } from "@/app/siap/ui";

export function SessionPick({ menu }: { menu: string }) {
  const choice = sessionMenu(menu);
  const sessions = useSiapQuery<SessionCardData[]>("/api/sessions", undefined, choice != null);
  if (!choice) {
    return <p className="text-sm">Menu ini tidak memakai pilihan sesi.</p>;
  }
  if (sessions.isPending) {
    return <LoadingMark />;
  }
  const rows = sessions.data ?? [];
  return (
    <>
      <h1 className="text-2xl font-semibold">{choice.title}</h1>
      <PageLead>Pilih sesi yang ingin diatur. Menu ini mengikuti sesi yang diklik.</PageLead>
      {sessions.isError ? <ErrorText>Gagal memuat sesi.</ErrorText> : null}
      {rows.length === 0 && !sessions.isError ? <EmptyState menu="sesi" /> : null}
      <ul className={`mt-6 flex flex-col gap-3 ${scrollListClass}`}>
        {rows.map((session) => (
          <li key={session.id}>
            <SessionCard session={session} href={`/siap/${session.id}/${choice.path}`} />
          </li>
        ))}
      </ul>
    </>
  );
}
