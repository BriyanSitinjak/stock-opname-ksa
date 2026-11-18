import { Suspense, type ReactNode } from "react";
import { CoordinatorShell } from "@/app/siap/shell";

export default function SiapLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-ksa-cream" />}>
      <CoordinatorShell>{children}</CoordinatorShell>
    </Suspense>
  );
}
