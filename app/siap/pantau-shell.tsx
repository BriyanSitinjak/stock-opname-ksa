import type { ReactNode } from "react";
import { StatusLegend } from "@/app/siap/pantau-ui";
import { BackLink, PageLead } from "@/app/siap/ui";

export function SiapSubpage({
  backHref,
  title,
  subtitle,
  legend = false,
  action,
  children,
}: {
  backHref: string;
  title: string;
  subtitle?: string;
  legend?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <BackLink href={backHref} />
      <div className="mt-3 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {action}
      </div>
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
