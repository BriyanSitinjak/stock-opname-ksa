export const PENDING_CAPTION = "Angka dari HP saat sync terakhir, bukan antrian di server.";

export function formatSyncAge(iso: string | null, now = Date.now()) {
  if (!iso) {
    return "Belum pernah sinkron";
  }
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) {
    return "Baru saja";
  }
  if (minutes < 60) {
    return `${minutes} menit lalu`;
  }
  return `${Math.floor(minutes / 60)} jam lalu`;
}
