import type { ReactNode } from "react";
import { SiapSubpage } from "@/app/siap/pantau-shell";
import { SessionIdPage } from "@/app/siap/session-id";

export function LaporanShell({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <SiapSubpage backHref={`/siap/${id}/laporan`} title={title} subtitle={subtitle}>
      {children}
    </SiapSubpage>
  );
}

export function LaporanPage({
  params,
  title,
  subtitle,
  children,
}: {
  params: Promise<{ id: string }>;
  title: string;
  subtitle?: string;
  children: (id: string) => ReactNode;
}) {
  return (
    <SessionIdPage params={params}>
      {(id) => (
        <LaporanShell id={id} title={title} subtitle={subtitle}>
          {children(id)}
        </LaporanShell>
      )}
    </SessionIdPage>
  );
}
