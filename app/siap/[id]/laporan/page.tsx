import Link from "next/link";
import { SiapSubpage } from "@/app/siap/pantau-shell";
import { SessionIdPage } from "@/app/siap/session-id";

const LINKS = [
  { href: "selisih-hitung", title: "Selisih hitung", blurb: "Dua petugas beda hasil. Tugaskan pass 3." },
  { href: "selisih-sistem", title: "Selisih sistem", blurb: "Hasil hitung vs qty on hand. Zero found ditandai." },
  { href: "kondisi", title: "Kondisi", blurb: "Baik, rusak, kadaluarsa. Tidak mengubah selisih." },
  { href: "tidak-dikenal", title: "Barang tidak dikenal", blurb: "Catatan dari HP yang tidak ada di snapshot." },
  { href: "rekap-tag", title: "Rekap tag", blurb: "Jumlah tag per status, dari submission." },
  { href: "daftar-barang", title: "Daftar barang", blurb: "Snapshot sesi, bisa difilter." },
  { href: "peta-barang", title: "Peta barang", blurb: "Lokasi pin dan qty yang sudah disepakati." },
];

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SessionIdPage params={params}>{(id) => <LaporanHome id={id} />}</SessionIdPage>;
}

function LaporanHome({ id }: { id: string }) {
  return (
    <SiapSubpage backHref={`/siap/${id}`} title="Laporan">
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={`/siap/${id}/laporan/${link.href}`} className="block rounded-2xl bg-white p-5 shadow-sm">
              <p className="font-medium">{link.title}</p>
              <p className="mt-1 text-sm text-[#6b6b6b]">{link.blurb}</p>
            </Link>
          </li>
        ))}
      </ul>
    </SiapSubpage>
  );
}
