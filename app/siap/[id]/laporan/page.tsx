import { ArrowLeftRight, ClipboardList, MapPin, PackageSearch, Scale, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { SiapSubpage } from "@/app/siap/pantau-shell";
import { SessionIdPage } from "@/app/siap/session-id";

const LINKS: { href: string; title: string; blurb: string; icon: LucideIcon }[] = [
  { href: "selisih-hitung", title: "Selisih hitung", blurb: "Dua petugas beda hasil pada tag yang sama. Dari sini tugaskan pass 3.", icon: Scale },
  { href: "selisih-sistem", title: "Selisih sistem", blurb: "Hasil hitung yang sudah sepakat dibanding qty on hand. Zero found ditandai.", icon: ArrowLeftRight },
  { href: "kondisi", title: "Kondisi", blurb: "Baik, rusak, dan kadaluarsa. Catatan ini tidak mengubah angka selisih.", icon: TriangleAlert },
  { href: "tidak-dikenal", title: "Barang tidak dikenal", blurb: "Barang yang dicatat di HP tetapi tidak ada di snapshot sesi.", icon: PackageSearch },
  { href: "rekap-tag", title: "Rekap tag", blurb: "Jumlah tag per status, dihitung dari submission yang sudah masuk.", icon: ClipboardList },
  { href: "peta-barang", title: "Peta barang", blurb: "Lokasi pin dan qty yang sudah disepakati setelah pass 1.", icon: MapPin },
];

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SessionIdPage params={params}>{(id) => <LaporanHome id={id} />}</SessionIdPage>;
}

function LaporanHome({ id }: { id: string }) {
  return (
    <SiapSubpage
      backHref={`/siap/${id}`}
      title="Laporan"
      subtitle="Laporan membaca pin sesi dan count yang sudah masuk. Selisih hitung diselesaikan dulu, baru selisih sistem dan export akhir dipakai di Persetujuan."
    >
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
          <li key={link.href}>
            <Link href={`/siap/${id}/laporan/${link.href}`} className="flex h-full gap-4 rounded-2xl bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ksa-sage text-ksa-teal-deep">
                <Icon aria-hidden size={20} strokeWidth={2} />
              </span>
              <span>
                <span className="block font-medium">{link.title}</span>
                <span className="mt-1 block text-sm leading-6 text-[#6b6b6b]">{link.blurb}</span>
              </span>
            </Link>
          </li>
          );
        })}
      </ul>
    </SiapSubpage>
  );
}
