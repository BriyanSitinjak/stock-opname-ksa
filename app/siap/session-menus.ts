import {
  ArrowLeftRight,
  BadgeCheck,
  ClipboardList,
  Files,
  Map,
  MapPin,
  Scale,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export type SessionMenu = {
  key: string;
  title: string;
  path: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

export const sessionMenuGroups: { label: string; items: SessionMenu[] }[] = [
  {
    label: "Pelaksanaan",
    items: [
      { key: "tugas", title: "Bagi tugas", path: "tugas", icon: ClipboardList, match: (pathname) => pathname.endsWith("/tugas") },
      { key: "pantau", title: "Pantau gudang", path: "pantau", icon: Map, match: (pathname) => pathname.includes("/pantau") },
      { key: "petugas", title: "Status petugas", path: "petugas", icon: Smartphone, match: (pathname) => pathname.endsWith("/petugas") },
    ],
  },
  {
    label: "Laporan",
    items: [
      { key: "selisih-hitung", title: "Selisih hitung", path: "laporan/selisih-hitung", icon: Scale, match: (pathname) => pathname.endsWith("/selisih-hitung") },
      { key: "selisih-sistem", title: "Selisih sistem", path: "laporan/selisih-sistem", icon: ArrowLeftRight, match: (pathname) => pathname.endsWith("/selisih-sistem") },
      {
        key: "laporan",
        title: "Laporan pendukung",
        path: "laporan",
        icon: Files,
        match: (pathname) => /\/laporan$/.test(pathname) || pathname.endsWith("/kondisi") || pathname.endsWith("/tidak-dikenal") || pathname.endsWith("/rekap-tag"),
      },
      { key: "peta-barang", title: "Peta barang", path: "laporan/peta-barang", icon: MapPin, match: (pathname) => pathname.endsWith("/peta-barang") },
    ],
  },
  {
    label: "Penutupan",
    items: [
      { key: "persetujuan", title: "Persetujuan", path: "persetujuan", icon: BadgeCheck, match: (pathname) => pathname.endsWith("/persetujuan") },
    ],
  },
];

export function sessionMenu(key: string) {
  return sessionMenuGroups.flatMap((group) => group.items).find((item) => item.key === key);
}
