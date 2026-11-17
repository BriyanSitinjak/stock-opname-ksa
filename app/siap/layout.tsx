import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLockup } from "@/app/brand-lockup";

export default function SiapLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-ksa-cream text-[#1c1c1c]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/siap">
          <BrandLockup width={220} height={48} />
        </Link>
        <nav className="flex gap-4 text-sm text-ksa-teal-deep">
          <Link href="/siap">Sesi</Link>
          <Link href="/hitung">Hitung</Link>
        </nav>
      </header>
      <div className="mx-auto max-w-5xl px-6 pb-16">{children}</div>
    </div>
  );
}
