// Offline acknowledgements stay on the device. Petugas ke-1 confirms they will
// hand off; petugas ke-2 confirms ke-1 is done. No server round-trip required.

function passAckKey(sessionId: string, tagId: string, pass: number) {
  return `pass_ack:${sessionId}:${tagId}:${pass}`;
}

export function hasPassAck(sessionId: string, tagId: string, pass: number) {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(passAckKey(sessionId, tagId, pass)) === "1";
}

export function setPassAck(sessionId: string, tagId: string, pass: number) {
  localStorage.setItem(passAckKey(sessionId, tagId, pass), "1");
}

export function passAckCopy(pass: number): { title: string; body: string } | null {
  if (pass === 1) {
    return {
      title: "Ingat untuk Hitung ke-2",
      body: "Setelah lorong selesai, beritahu petugas Hitung ke-2 bahwa lorong siap dicek ulang. Data tetap di HP meski offline.",
    };
  }
  if (pass === 2) {
    return {
      title: "Pastikan Hitung ke-1 selesai",
      body: "Jangan mulai sebelum Hitung ke-1 selesai di lorong ini. Tanya petugas ke-1 atau koordinator jika ragu. Bisa tetap offline.",
    };
  }
  return null;
}
