import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Stock Opname</h1>
      <p className="text-sm text-zinc-600">Irisan vertikal: ikat perangkat, unduh, hitung, kirim.</p>
      <Link className="underline" href="/hitung">
        Buka layar hitung
      </Link>
      <Link className="underline" href="/api/docs/ui">
        Dokumentasi API
      </Link>
    </main>
  );
}
