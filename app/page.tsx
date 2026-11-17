import Link from "next/link";
import { BrandLockup } from "@/app/brand-lockup";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[390px] flex-col items-center justify-center gap-8 px-6 py-10">
      <BrandLockup width={280} height={60} />
      <p className="text-center text-sm text-[#6b6b6b]">Hitung stok di gudang, tanpa sinyal setelah persiapan.</p>
      <Link
        className="w-full rounded-full bg-ksa-teal py-3.5 text-center font-medium text-white"
        href="/hitung"
      >
        Buka layar hitung
      </Link>
      <Link className="text-sm text-ksa-teal-deep" href="/api/docs/ui">
        Dokumentasi API
      </Link>
    </main>
  );
}
