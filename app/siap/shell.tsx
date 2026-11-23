"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  FileUp,
  History,
  House,
  LayoutGrid,
  List,
  LogOut,
  Plus,
  TabletSmartphone,
  Users,
  type LucideIcon,
} from "lucide-react";
import { BrandIcon } from "@/app/brand-lockup";
import { confirm } from "@/app/confirm";
import { LoadingMark } from "@/app/loading-mark";
import { siapKey, useSiapQuery, useSiapQueryClient } from "@/app/siap/query";
import { CoordinatorGate } from "@/app/siap/gate";
import { sessionMenuGroups, type SessionMenu } from "@/app/siap/session-menus";
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
    items: () => [
      {
        label: "Sesi baru",
        icon: Plus,
        href: "/siap/baru",
        match: (pathname) => pathname === "/siap/baru",
      },
      {
        label: "Impor",
        icon: FileUp,
        href: "/siap/impor",
        match: (pathname) => pathname === "/siap/impor",
      },
      {
        label: "Daftar barang",
        icon: List,
        href: "/siap/daftar-barang",
        match: (pathname) => pathname === "/siap/daftar-barang",
      },
      {
        label: "Pengguna",
        icon: Users,
        href: "/siap/pengguna",
        match: (pathname) => pathname === "/siap/pengguna",
      },
      {
        label: "Riwayat",
        icon: History,
        href: "/siap/riwayat",
        match: (pathname) => pathname === "/siap/riwayat",
      },
      {
        label: "Denah gudang",
        icon: LayoutGrid,
        href: "/siap/denah",
        match: (pathname) => pathname === "/siap/denah",
      },
    ],
  },
  ...sessionMenuGroups.map((group) => ({
    label: group.label,
    items: () => group.items.map(menuLink),
  })),
];

function menuLink(menu: SessionMenu): NavItem {
  return {
    label: menu.title,
    icon: menu.icon,
    href: `/siap/pilih/${menu.key}`,
    match: menu.match,
  };
}

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
  const router = useRouter();
  const pathSession = sessionFromPath(pathname);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const queryClient = useSiapQueryClient();
  const me = useSiapQuery<StaffSession>("/api/auth/me", undefined, !signedOut);
  const staff = signedOut ? null : me.isPending ? undefined : me.isError ? null : me.data;
  const sessions = useSiapQuery<{ id: string }[]>("/api/sessions", undefined, Boolean(staff) && !pathSession);
  const sessionId = pathSession ?? sessions.data?.[0]?.id ?? null;
  const menuOpen = menuPath === pathname;

  useEffect(() => {
    const onRequired = () => {
      setSignedOut(true);
      if (pathname !== "/siap") {
        router.replace("/siap");
      }
    };
    window.addEventListener("ksa-staff-required", onRequired);
    return () => window.removeEventListener("ksa-staff-required", onRequired);
  }, [pathname, router]);

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
    queryClient.clear();
    setSignedOut(true);
    router.replace("/siap");
  }

  // Keep `children` mounted so Next.js does not drop the page segment when the
  // gate or loading mark covers the shell.
  if (staff === undefined) {
    return (
      <>
        <LoadingMark />
        <div hidden>{children}</div>
      </>
    );
  }
  if (staff === null) {
    return (
      <>
        <CoordinatorGate
          onReady={(next) => {
            setSignedOut(false);
            queryClient.setQueryData(siapKey("/api/auth/me"), next);
          }}
        />
        <div hidden>{children}</div>
      </>
    );
  }

  return (
    <div className="min-h-dvh bg-ksa-cream lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden h-dvh flex-col self-start bg-[#1c1c1c] px-3 py-5 text-white lg:sticky lg:top-0 lg:flex">
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
