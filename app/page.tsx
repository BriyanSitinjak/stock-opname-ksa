import { ClipboardList, TabletSmartphone } from "lucide-react";
import Link from "next/link";
import { BrandLockup } from "@/app/brand-lockup";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[390px] flex-col items-center justify-center gap-8 px-6 py-10">
      <BrandLockup width={280} height={60} />
      <p className="text-center text-sm text-[#6b6b6b]">Hitung stok di gudang. Setelah prepare, bisa lanjut tanpa sinyal.</p>
      <div className="flex w-full flex-col gap-3">
        <Link href="/hitung" className="flex items-center gap-4 rounded-3xl bg-ksa-teal px-5 py-4 text-white">
          <TabletSmartphone aria-hidden size={22} strokeWidth={2} className="shrink-0" />
          <span>
            <span className="block font-medium">Layar hitung</span>
            <span className="block text-sm text-white/80">Petugas hitung di HP.</span>
          </span>
        </Link>
        <Link href="/siap" className="flex items-center gap-4 rounded-3xl border border-[#e7dfd2] bg-white px-5 py-4 text-[#1c1c1c] shadow-sm">
          <ClipboardList aria-hidden size={22} strokeWidth={2} className="shrink-0 text-ksa-teal-deep" />
          <span>
            <span className="block font-medium">Layar koordinator</span>
            <span className="block text-sm text-[#6b6b6b]">Sesi, impor, dan laporan.</span>
          </span>
        </Link>
      </div>
    </main>
  );
}
