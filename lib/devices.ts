import { prisma } from "@/lib/db";

export async function releaseDevice(sessionId: string, deviceId: string) {
  const row = await prisma.userDevice.findUnique({
    where: { sessionId_deviceId: { sessionId, deviceId } },
  });
  if (!row || row.releasedAt) {
    return { error: "Perangkat tidak terikat.", status: 404 as const };
  }
  await prisma.userDevice.update({
    where: { sessionId_deviceId: { sessionId, deviceId } },
    data: { releasedAt: new Date() },
  });
  return { ok: true as const, device_id: deviceId };
}
