"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BrandIcon } from "@/app/brand-lockup";
import { fetchJson } from "@/app/siap/api";
import { parseId } from "@/lib/ids";

type NavItem = {
  label: string;
  href: string;
  match: (pathname: string) => boolean;
};

const GROUPS: { label: string; items: (sessionId: string | null) => NavItem[] }[] = [
  {
    label: "Beranda",
    items: (sessionId) => [
      {
        label: "Beranda",
        href: sessionId ? `/siap/${sessionId}` : "/siap",
        match: (pathname) => pathname === "/siap" || (sessionId != null && pathname === `/siap/${sessionId}`),
      },
    ],
  },
  {
    label: "Persiapan",
    items: (sessionId) => [
      {
        label: "Sesi baru",
        href: "/siap/baru",
        match: (pathname) => pathname === "/siap/baru",
      },
      {
        label: "Impor",
        href: sessionId ? `/siap/${sessionId}/impor` : "/siap/baru",
        match: (pathname) => pathname.endsWith("/impor"),
      },
      {
        label: "Daftar barang",
        href: sessionId ? `/siap/${sessionId}/laporan/daftar-barang` : "/siap",
        match: (pathname) => pathname.endsWith("/daftar-barang"),
      },
    ],
  },
  {
    label: "Pelaksanaan",
    items: (sessionId) => [
      {
        label: "Bagi tugas",
        href: sessionId ? `/siap/${sessionId}/tugas` : "/siap",
        match: (pathname) => pathname.endsWith("/tugas"),
      },
      {
        label: "Pantau gudang",
        href: sessionId ? `/siap/${sessionId}/pantau` : "/siap",
        match: (pathname) => pathname.includes("/pantau"),
      },
      {
        label: "Status petugas",
        href: sessionId ? `/siap/${sessionId}/petugas` : "/siap",
        match: (pathname) => pathname.endsWith("/petugas"),
      },
    ],
  },
  {
    label: "Laporan",
    items: (sessionId) => [
      {
        label: "Selisih hitung",
        href: sessionId ? `/siap/${sessionId}/laporan/selisih-hitung` : "/siap",
        match: (pathname) => pathname.endsWith("/selisih-hitung"),
      },
      {
        label: "Selisih sistem",
        href: sessionId ? `/siap/${sessionId}/laporan/selisih-sistem` : "/siap",
        match: (pathname) => pathname.endsWith("/selisih-sistem"),
      },
      {
        label: "Laporan pendukung",
        href: sessionId ? `/siap/${sessionId}/laporan` : "/siap",
        match: (pathname) => /\/laporan$/.test(pathname) || pathname.endsWith("/kondisi") || pathname.endsWith("/tidak-dikenal") || pathname.endsWith("/rekap-tag"),
      },
      {
        label: "Peta barang",
        href: sessionId ? `/siap/${sessionId}/laporan/peta-barang` : "/siap",
        match: (pathname) => pathname.endsWith("/peta-barang"),
      },
    ],
  },
  {
    label: "Penutupan",
    items: (sessionId) => [
      {
        label: "Persetujuan",
        href: sessionId ? `/siap/${sessionId}/persetujuan` : "/siap",
        match: (pathname) => pathname.endsWith("/persetujuan"),
      },
    ],
  },
];

function sessionFromPath(pathname: string) {
  const segment = pathname.split("/")[2] ?? "";
  return parseId(segment, "ses");
}

function NavLinks({ sessionId, pathname, onNavigate }: { sessionId: string | null; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-5">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[11px] font-medium tracking-[0.14em] text-white/40 uppercase">{group.label}</p>
          <ul className="mt-1">
            {group.items(sessionId).map((item) => {
              const active = item.match(pathname);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`block rounded-lg px-3 py-2 text-sm ${active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function CoordinatorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pathSession = sessionFromPath(pathname);
  const [fallbackId, setFallbackId] = useState<string | null>(null);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const sessionId = pathSession ?? fallbackId;
  const menuOpen = menuPath === pathname;

  useEffect(() => {
    if (pathSession) {
      return;
    }
    let cancelled = false;
    void fetchJson<{ id: string }[]>("/api/sessions").then(({ ok, data }) => {
      if (!cancelled && ok) {
        setFallbackId(data[0]?.id ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pathSession]);

  return (
    <div className="min-h-dvh bg-ksa-cream lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden min-h-dvh flex-col bg-[#1c1c1c] px-3 py-5 text-white lg:flex">
        <Link href={sessionId ? `/siap/${sessionId}` : "/siap"} className="mb-6 flex items-center gap-2 px-2">
          <BrandIcon size={28} className="rounded-md" />
          <span className="text-sm font-medium">Stock Opname</span>
        </Link>
        <div className="flex-1 overflow-y-auto">
          <NavLinks sessionId={sessionId} pathname={pathname} />
        </div>
        <Link href="/hitung" className="mt-4 px-3 py-2 text-sm text-white/60 hover:text-white">
          Layar hitung
        </Link>
      </aside>

      <div className="lg:hidden">
        <div className="flex items-center justify-between bg-[#1c1c1c] px-4 py-3 text-white">
          <Link href={sessionId ? `/siap/${sessionId}` : "/siap"} className="flex items-center gap-2">
            <BrandIcon size={24} className="rounded-md" />
            <span className="text-sm font-medium">Stock Opname</span>
          </Link>
          <button type="button" className="text-sm text-white/80" onClick={() => setMenuPath(menuOpen ? null : pathname)}>
            {menuOpen ? "Tutup" : "Menu"}
          </button>
        </div>
        {menuOpen ? (
          <div className="bg-[#1c1c1c] px-3 pb-4">
            <NavLinks sessionId={sessionId} pathname={pathname} onNavigate={() => setMenuPath(null)} />
            <Link href="/hitung" className="mt-3 block px-3 py-2 text-sm text-white/60">
              Layar hitung
            </Link>
          </div>
        ) : null}
      </div>

      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
