import { prisma } from "@/lib/db";
import { ADMIN_ID } from "@/lib/fixture";

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

// One phone is one counter. After Keluar the row stays with releasedAt set, so
// the next bind on the same device must revive that row instead of inserting again.
export async function bindDevice(
  sessionId: string,
  userId: string,
  deviceId: string,
): Promise<{ ok: true; device_id: string } | { error: string; status: 409 }> {
  const liveForUser = await prisma.userDevice.findFirst({
    where: { sessionId, userId, releasedAt: null },
  });
  if (liveForUser && liveForUser.deviceId !== deviceId) {
    return {
      error: `Petugas masih terikat pada ${liveForUser.deviceId}. Pending terakhir yang dilaporkan: ${liveForUser.lastReportedPending}.`,
      status: 409 as const,
    };
  }

  const sameDevice = await prisma.userDevice.findUnique({
    where: { sessionId_deviceId: { sessionId, deviceId } },
  });
  if (sameDevice && !sameDevice.releasedAt && sameDevice.userId !== userId) {
    return { error: "HP ini masih terikat ke petugas lain.", status: 409 as const };
  }

  if (sameDevice) {
    if (sameDevice.releasedAt || sameDevice.userId !== userId) {
      await prisma.userDevice.update({
        where: { sessionId_deviceId: { sessionId, deviceId } },
        data: {
          userId,
          releasedAt: null,
          boundAt: new Date(),
          boundById: ADMIN_ID,
          lastReportedPending: 0,
          lastSyncAt: null,
        },
      });
    }
    return { ok: true as const, device_id: deviceId };
  }

  await prisma.userDevice.create({
    data: {
      sessionId,
      deviceId,
      userId,
      boundById: ADMIN_ID,
    },
  });
  return { ok: true as const, device_id: deviceId };
}
