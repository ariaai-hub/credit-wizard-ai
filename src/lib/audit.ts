import { prisma } from "@/lib/prisma";

export async function getTenantAuditOverview(tenantId: string) {
  const [totalEvents, latestEvents, eventTypeCounts] = await Promise.all([
    prisma.auditLog.count({ where: { tenantId } }),
    prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        eventType: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.groupBy({
      by: ["eventType"],
      where: { tenantId },
      _count: {
        eventType: true,
      },
      orderBy: {
        _count: {
          eventType: "desc",
        },
      },
      take: 6,
    }),
  ]);

  return {
    totalEvents,
    latestEvents,
    eventTypeCounts: eventTypeCounts.map((entry) => ({
      eventType: entry.eventType,
      count: entry._count.eventType,
    })),
  };
}

export async function getTenantAuditTrail(tenantId: string) {
  return prisma.auditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      actorUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}
