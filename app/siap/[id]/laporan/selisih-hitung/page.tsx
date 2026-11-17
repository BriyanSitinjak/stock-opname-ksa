import { LaporanPage } from "@/app/siap/laporan-shell";
import { prisma } from "@/lib/db";
import { selisihHitung } from "@/lib/reports";
import { SelisihHitungBoard } from "./board";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <LaporanPage params={params} title="Selisih hitung">
      {(id) => <Body id={id} />}
    </LaporanPage>
  );
}

async function Body({ id }: { id: string }) {
  const [rows, counters] = await Promise.all([
    selisihHitung(id),
    prisma.user.findMany({
      where: { role: "counter", retiredAt: null },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
  ]);
  return <SelisihHitungBoard id={id} rows={rows} counters={counters} />;
}
