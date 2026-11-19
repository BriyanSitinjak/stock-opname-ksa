import type { ReactNode } from "react";
import { StatusLegend } from "@/app/siap/pantau-ui";
import { BackLink, PageLead } from "@/app/siap/ui";

export function SiapSubpage({
  backHref,
  title,
  subtitle,
  legend = false,
  children,
}: {
  backHref: string;
  title: string;
  subtitle?: string;
  legend?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <BackLink href={backHref} />
      <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
      {subtitle ? <PageLead>{subtitle}</PageLead> : null}
      {legend ? <StatusLegend /> : null}
      {children}
    </>
  );
}

export function MissingPin({ href, children }: { href: string; children: ReactNode }) {
  return (
    <>
      <BackLink href={href} />
      <p className="mt-6 text-sm">{children}</p>
    </>
  );
}
