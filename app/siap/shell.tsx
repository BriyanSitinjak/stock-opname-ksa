"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  BadgeCheck,
  ClipboardList,
  FileUp,
  Files,
  House,
  List,
  LogOut,
  Map,
  MapPin,
  Plus,
  Scale,
  Smartphone,
  TabletSmartphone,
  Users,
  type LucideIcon,
} from "lucide-react";
import { BrandIcon } from "@/app/brand-lockup";
import { confirm } from "@/app/confirm";
import { LoadingMark } from "@/app/loading-mark";
import { fetchJson } from "@/app/siap/api";
import { CoordinatorGate } from "@/app/siap/gate";
import { parseId } from "@/lib/ids";
import type { StaffSession } from "@/lib/staff-auth";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const GROUPS: { label: string; items: (sessionId: string | null) => NavItem[] }[] = [
  {
    label: "Beranda",
    items: (sessionId) => [
      {
        label: "Beranda",
        icon: House,
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
        icon: Plus,
        href: "/siap/baru",
        match: (pathname) => pathname === "/siap/baru",
      },
      {
        label: "Impor",
        icon: FileUp,
        href: sessionId ? `/siap/${sessionId}/impor` : "/siap/baru",
        match: (pathname) => pathname.endsWith("/impor"),
      },
      {
        label: "Daftar barang",
        icon: List,
        href: sessionId ? `/siap/${sessionId}/laporan/daftar-barang` : "/siap",
        match: (pathname) => pathname.endsWith("/daftar-barang"),
      },
      {
        label: "Pengguna",
        icon: Users,
        href: "/siap/pengguna",
        match: (pathname) => pathname === "/siap/pengguna",
      },
    ],
  },
  {
    label: "Pelaksanaan",
    items: (sessionId) => [
      {
        label: "Bagi tugas",
        icon: ClipboardList,
        href: sessionId ? `/siap/${sessionId}/tugas` : "/siap",
        match: (pathname) => pathname.endsWith("/tugas"),
      },
      {
        label: "Pantau gudang",
        icon: Map,
        href: sessionId ? `/siap/${sessionId}/pantau` : "/siap",
        match: (pathname) => pathname.includes("/pantau"),
      },
      {
        label: "Status petugas",
        icon: Smartphone,
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
        icon: Scale,
        href: sessionId ? `/siap/${sessionId}/laporan/selisih-hitung` : "/siap",
        match: (pathname) => pathname.endsWith("/selisih-hitung"),
      },
      {
        label: "Selisih sistem",
        icon: ArrowLeftRight,
        href: sessionId ? `/siap/${sessionId}/laporan/selisih-sistem` : "/siap",
        match: (pathname) => pathname.endsWith("/selisih-sistem"),
      },
      {
        label: "Laporan pendukung",
        icon: Files,
        href: sessionId ? `/siap/${sessionId}/laporan` : "/siap",
        match: (pathname) => /\/laporan$/.test(pathname) || pathname.endsWith("/kondisi") || pathname.endsWith("/tidak-dikenal") || pathname.endsWith("/rekap-tag"),
      },
      {
        label: "Peta barang",
        icon: MapPin,
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
        icon: BadgeCheck,
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

function MenuIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon size={16} strokeWidth={2} className="shrink-0" />;
}

function HomeLink({ sessionId, iconSize, className = "" }: { sessionId: string | null; iconSize: number; className?: string }) {
  return (
    <Link href={sessionId ? `/siap/${sessionId}` : "/siap"} className={`flex items-center gap-2 ${className}`}>
      <BrandIcon size={iconSize} className="rounded-md" />
      <span className="text-sm font-medium">Stock Opname</span>
    </Link>
  );
}

function StaffBar({ staff, onLeave }: { staff: StaffSession; onLeave: () => void }) {
  return (
    <div className="mt-4 px-3">
      <p className="truncate text-sm text-white/80">{staff.nama}</p>
      <button
        type="button"
        onClick={onLeave}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/50 px-3 py-2 text-sm text-white"
      >
        <LogOut aria-hidden size={16} strokeWidth={2} />
        Keluar
      </button>
    </div>
  );
}

function CountLink({ className, onNavigate }: { className: string; onNavigate?: () => void }) {
  return (
    <Link href="/hitung" onClick={onNavigate} className={`flex items-center gap-2.5 px-3 py-2 text-sm text-white/60 hover:text-white ${className}`}>
      <MenuIcon icon={TabletSmartphone} />
      Layar hitung
    </Link>
  );
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
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
                  >
                    <MenuIcon icon={item.icon} />
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
  const [staff, setStaff] = useState<StaffSession | null | undefined>(undefined);
  const sessionId = pathSession ?? fallbackId;
  const menuOpen = menuPath === pathname;

  useEffect(() => {
    let cancelled = false;
    void fetchJson<StaffSession>("/api/auth/me").then(({ ok, data }) => {
      if (!cancelled) {
        setStaff(ok ? data : null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onRequired = () => setStaff(null);
    window.addEventListener("ksa-staff-required", onRequired);
    return () => window.removeEventListener("ksa-staff-required", onRequired);
  }, []);

  useEffect(() => {
    if (pathSession || !staff) {
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
  }, [pathSession, staff]);

  async function leave() {
    const ok = await confirm({
      title: "Keluar dari Layar koordinator?",
      message: "Untuk masuk lagi, pilih nama dan isi password.",
      confirmLabel: "Keluar",
      tone: "danger",
    });
    if (!ok) {
      return;
    }
    await fetch("/api/auth/logout", { method: "POST" });
    setStaff(null);
  }

  if (staff === undefined) {
    return <LoadingMark />;
  }
  if (staff === null) {
    return <CoordinatorGate onReady={setStaff} />;
  }

  return (
    <div className="min-h-dvh bg-ksa-cream lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden min-h-dvh flex-col bg-[#1c1c1c] px-3 py-5 text-white lg:flex">
        <HomeLink sessionId={sessionId} iconSize={28} className="mb-6 px-2" />
        <div className="flex-1 overflow-y-auto">
          <NavLinks sessionId={sessionId} pathname={pathname} />
        </div>
        <StaffBar staff={staff} onLeave={() => void leave()} />
        <CountLink className="mt-2" />
      </aside>

      <div className="lg:hidden">
        <div className="flex items-center justify-between bg-[#1c1c1c] px-4 py-3 text-white">
          <HomeLink sessionId={sessionId} iconSize={24} />
          <button type="button" className="text-sm text-white/80" onClick={() => setMenuPath(menuOpen ? null : pathname)}>
            {menuOpen ? "Tutup" : "Menu"}
          </button>
        </div>
        {menuOpen ? (
          <div className="bg-[#1c1c1c] px-3 pb-4">
            <NavLinks sessionId={sessionId} pathname={pathname} onNavigate={() => setMenuPath(null)} />
            <StaffBar staff={staff} onLeave={() => void leave()} />
            <CountLink className="mt-2" onNavigate={() => setMenuPath(null)} />
          </div>
        ) : null}
      </div>

      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
