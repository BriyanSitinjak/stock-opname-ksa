export const TAG_STATUSES = ["belum", "menunggu_hitung_2", "selisih_hitung", "selesai", "kosong"] as const;
export type TagStatus = (typeof TAG_STATUSES)[number];

export const TAG_STATUS_LABEL: Record<TagStatus, string> = {
  belum: "Belum dihitung",
  menunggu_hitung_2: "Menunggu hitung ke-2",
  selisih_hitung: "Selisih hitung",
  selesai: "Selesai",
  kosong: "Kosong",
};

export const TAG_STATUS_MARK: Record<TagStatus, string> = {
  belum: "B",
  menunggu_hitung_2: "2",
  selisih_hitung: "≠",
  selesai: "S",
  kosong: "K",
};

export function statusCaption(status: TagStatus) {
  return `${TAG_STATUS_MARK[status]} ${TAG_STATUS_LABEL[status]}`;
}

export function selesaiCaption(row: { selesai: number; total: number; selisih_hitung: number }) {
  const base = `${row.selesai} / ${row.total} tag selesai`;
  return row.selisih_hitung > 0 ? `${base} · ≠ ${row.selisih_hitung} selisih hitung` : base;
}

export function pantauHref(sessionId: string, gudang?: string, lokasi?: string) {
  const parts = ["/siap", sessionId, "pantau"];
  if (gudang) {
    parts.push(encodeURIComponent(gudang));
  }
  if (lokasi) {
    parts.push(encodeURIComponent(lokasi));
  }
  return parts.join("/");
}

export type DenahTag = {
  tag_id: string;
  nomor: string;
  lokasi_nama: string;
  gudang_nama: string;
  weight: number;
  urutan: number;
  status: TagStatus;
  pass_1_nama: string | null;
  pass_2_nama: string | null;
};

export type DenahLokasi = {
  nama: string;
  selesai: number;
  total: number;
  selisih_hitung: number;
  tags: DenahTag[];
};

export type DenahGudang = {
  nama: string;
  selesai: number;
  total: number;
  selisih_hitung: number;
  lokasi: DenahLokasi[];
};

export const SAMPLE_DENAH_NOTE =
  "Denah contoh, belum di-pin. Layout ini bisa diganti selama sesi masih draft. Pin terjadi saat sesi dibuka.";
