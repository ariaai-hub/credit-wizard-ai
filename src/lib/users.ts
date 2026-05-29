import { prisma } from "@/lib/prisma";

export async function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: {
      email: email.trim().toLowerCase(),
    },
    include: {
      tenant: true,
    },
  });
}

export async function findUserByTenantSlugAndEmail(tenantSlug: string, email: string) {
  return prisma.user.findFirst({
    where: {
      email: email.trim().toLowerCase(),
      tenant: {
        slug: tenantSlug.trim().toLowerCase(),
      },
    },
    include: {
      tenant: true,
    },
  });
}

export async function getTenantTeamSnapshot(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

export async function getPendingInvitations(tenantId: string) {
  const invitations = await prisma.userInvitation.findMany({
    where: {
      tenantId,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      token: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  if (invitations.length === 0) {
    return [];
  }

  const auditEvents = await prisma.auditLog.findMany({
    where: {
      tenantId,
      referenceType: "user_invitation",
      referenceId: {
        in: invitations.map((invitation) => invitation.id),
      },
      eventType: {
        in: [
          "STAFF_INVITATION_CREATED",
          "STAFF_INVITATION_DELIVERY_SENT",
          "STAFF_INVITATION_DELIVERY_SKIPPED",
          "STAFF_INVITATION_DELIVERY_FAILED",
          "STAFF_INVITATION_REVOKED",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      referenceId: true,
      eventType: true,
      outputSnapshotJson: true,
      createdAt: true,
    },
  });

  return invitations.map((invitation) => {
    const latestDeliveryEvent = auditEvents.find(
      (event) =>
        event.referenceId === invitation.id &&
        event.eventType !== "STAFF_INVITATION_CREATED",
    );

    return {
      ...invitation,
      deliveryStatus:
        latestDeliveryEvent?.eventType === "STAFF_INVITATION_DELIVERY_SENT"
          ? "sent"
          : latestDeliveryEvent?.eventType === "STAFF_INVITATION_DELIVERY_FAILED"
            ? "failed"
            : latestDeliveryEvent?.eventType === "STAFF_INVITATION_REVOKED"
              ? "revoked"
            : latestDeliveryEvent?.eventType === "STAFF_INVITATION_DELIVERY_SKIPPED"
              ? "manual"
              : "pending",
      deliveryUpdatedAt: latestDeliveryEvent?.createdAt ?? null,
      deliveryMeta: latestDeliveryEvent?.outputSnapshotJson ?? null,
    };
  });
}
