import { randomBytes } from "node:crypto";

import { AccessMode, InvitationStatus, Prisma, SubscriptionStatus, TenantStatus, UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";

import { getPlanDefinition } from "@/lib/billing";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export const companyOnboardingSchema = z.object({
  companyName: z.string().min(2),
  ownerName: z.string().min(2),
  ownerEmail: z.email(),
  ownerPhone: z.string().min(7).optional().or(z.literal("")),
  billingEmail: z.email().optional().or(z.literal("")),
  companyPhone: z.string().min(7).optional().or(z.literal("")),
  planKey: z.enum(["starter", "growth", "scale"]),
  crcConfigRef: z.string().optional().or(z.literal("")),
  creditProvider: z.enum(["CREDIT_HERO", "IDENTITYIQ"]),
  creditProviderRef: z.string().optional().or(z.literal("")),
  mailQueueDestination: z.string().optional().or(z.literal("")),
  password: z.string().min(10),
});

export type CompanyOnboardingInput = z.infer<typeof companyOnboardingSchema>;

type CreateTenantOptions = {
  initialTenantStatus?: TenantStatus;
  initialAccessMode?: AccessMode;
  subscriptionStatus?: SubscriptionStatus;
  skipInitialTokenAllocation?: boolean;
  subscriptionMetadata?: Prisma.InputJsonValue;
};

export async function createTenantWithOwner(input: CompanyOnboardingInput, options: CreateTenantOptions = {}) {
  const parsed = companyOnboardingSchema.parse(input);
  const plan = getPlanDefinition(parsed.planKey);

  if (!plan) {
    throw new Error("Invalid plan selected.");
  }

  const billingEmail = parsed.billingEmail || parsed.ownerEmail;
  const ownerPhone = parsed.ownerPhone || null;
  const companyPhone = parsed.companyPhone || null;

  const baseSlug = slugify(parsed.companyName);
  const slug = await ensureUniqueTenantSlug(baseSlug);
  const passwordHash = await hashPassword(parsed.password);
  const initialTenantStatus = options.initialTenantStatus ?? TenantStatus.ACTIVE;
  const initialAccessMode = options.initialAccessMode ?? AccessMode.READ_WRITE;
  const subscriptionStatus = options.subscriptionStatus ?? SubscriptionStatus.TRIALING;
  const skipInitialTokenAllocation = options.skipInitialTokenAllocation ?? false;

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: parsed.companyName,
        slug,
        status: initialTenantStatus,
        accessMode: initialAccessMode,
        billingEmail,
        ownerName: parsed.ownerName,
        ownerEmail: parsed.ownerEmail,
        ownerPhone,
        companyPhone,
        crcConfigRef: parsed.crcConfigRef || null,
        creditProvider: parsed.creditProvider,
        creditProviderRef: parsed.creditProviderRef || null,
        mailQueueDestination: parsed.mailQueueDestination || null,
      },
    });

    const owner = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: parsed.ownerEmail,
        name: parsed.ownerName,
        phone: ownerPhone,
        role: UserRole.OWNER,
        status: UserStatus.ACTIVE,
        passwordHash,
      },
    });

    await tx.billingSubscription.create({
      data: {
        tenantId: tenant.id,
        planKey: plan.key,
        status: subscriptionStatus,
        includedTokenAllowance: plan.includedTokens,
        staffSeatLimit: plan.staffSeatLimit,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        metadataJson: options.subscriptionMetadata ?? {
          mode: "test",
          source: "manual-onboarding",
        },
      },
    });

    // Create mailing token account (for mail queue)
    await tx.mailTokenAccount.create({
      data: {
        tenantId: tenant.id,
        includedBalance: plan.includedTokens,
        purchasedBalance: 0,
        usedBalance: 0,
      },
    });

    if (!skipInitialTokenAllocation) {
      const tokenAccount = await tx.tokenAccount.create({
        data: {
          tenantId: tenant.id,
          includedBalance: plan.includedTokens,
        },
      });

      await tx.tokenTransaction.create({
        data: {
          tenantId: tenant.id,
          tokenAccountId: tokenAccount.id,
          transactionType: "ALLOCATION",
          quantity: plan.includedTokens,
          notes: `Initial included token allocation for ${plan.name}`,
          createdByUserId: owner.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorType: "system",
        actorUserId: owner.id,
        eventType: "TENANT_BOOTSTRAPPED",
        referenceType: "tenant",
        referenceId: tenant.id,
        inputSnapshotJson: parsed satisfies Prisma.InputJsonValue,
        outputSnapshotJson: {
          ownerUserId: owner.id,
          planKey: plan.key,
          includedTokens: plan.includedTokens,
          staffSeatLimit: plan.staffSeatLimit,
          tenantStatus: initialTenantStatus,
          accessMode: initialAccessMode,
          initialTokenAllocationSkipped: skipInitialTokenAllocation,
        },
      },
    });

    return { tenant, owner };
  });
}

export async function getSeatUsage(tenantId: string) {
  const [subscription, activeStaffUsers, pendingInvites] = await Promise.all([
    prisma.billingSubscription.findFirst({
      where: {
        tenantId,
        status: {
          in: [SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE, SubscriptionStatus.PAST_DUE],
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({
      where: {
        tenantId,
        role: {
          not: UserRole.OWNER,
        },
        status: {
          in: [UserStatus.INVITED, UserStatus.ACTIVE],
        },
      },
    }),
    prisma.userInvitation.count({
      where: {
        tenantId,
        status: InvitationStatus.PENDING,
      },
    }),
  ]);

  const seatLimit = subscription?.staffSeatLimit ?? 1;
  const reservedSeats = activeStaffUsers + pendingInvites;

  return {
    seatLimit,
    usedSeats: activeStaffUsers,
    pendingInvites,
    reservedSeats,
    remainingSeats: Math.max(seatLimit - reservedSeats, 0),
  };
}

export async function createStaffInvitation({
  tenantId,
  invitedByUserId,
  email,
  name,
  role,
}: {
  tenantId: string;
  invitedByUserId: string;
  email: string;
  name?: string;
  role: UserRole;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const { remainingSeats } = await getSeatUsage(tenantId);
  if (remainingSeats <= 0) {
    throw new Error("Staff seat limit reached for this company.");
  }

  const [existingUser, existingPendingInvite] = await Promise.all([
    prisma.user.findFirst({
      where: {
        tenantId,
        email: normalizedEmail,
      },
    }),
    prisma.userInvitation.findFirst({
      where: {
        tenantId,
        email: normalizedEmail,
        status: InvitationStatus.PENDING,
      },
    }),
  ]);

  if (existingUser) {
    throw new Error("That email already has access to this company.");
  }

  if (existingPendingInvite) {
    throw new Error("There is already a pending invitation for that email.");
  }

  return prisma.$transaction(async (tx) => {
    const invitation = await tx.userInvitation.create({
      data: {
        tenantId,
        email: normalizedEmail,
        name,
        role,
        token: randomBytes(24).toString("hex"),
        invitedByUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId: invitedByUserId,
        eventType: "STAFF_INVITATION_CREATED",
        referenceType: "user_invitation",
        referenceId: invitation.id,
        inputSnapshotJson: {
          email: normalizedEmail,
          name,
          role,
        },
        outputSnapshotJson: {
          invitationId: invitation.id,
          expiresAt: invitation.expiresAt,
        },
      },
    });

    return invitation;
  });
}

export async function getInvitationByToken(token: string) {
  return prisma.userInvitation.findUnique({
    where: { token },
    include: {
      tenant: true,
    },
  });
}

export async function revokeStaffInvitation({
  tenantId,
  invitationId,
  actorUserId,
}: {
  tenantId: string;
  invitationId: string;
  actorUserId: string;
}) {
  const invitation = await prisma.userInvitation.findFirst({
    where: {
      id: invitationId,
      tenantId,
    },
  });

  if (!invitation) {
    throw new Error("Invitation not found for this tenant.");
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new Error("Only pending invitations can be revoked.");
  }

  return prisma.$transaction(async (tx) => {
    const revokedInvitation = await tx.userInvitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.REVOKED,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: "user",
        actorUserId,
        eventType: "STAFF_INVITATION_REVOKED",
        referenceType: "user_invitation",
        referenceId: invitation.id,
        inputSnapshotJson: {
          email: invitation.email,
          role: invitation.role,
        },
        outputSnapshotJson: {
          status: revokedInvitation.status,
        },
      },
    });

    return revokedInvitation;
  });
}

export async function acceptStaffInvitation({
  token,
  password,
  phone,
}: {
  token: string;
  password: string;
  phone?: string;
}) {
  const invitation = await prisma.userInvitation.findUnique({
    where: { token },
    include: { tenant: true },
  });

  if (!invitation) {
    throw new Error("Invitation not found.");
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw new Error("Invitation is no longer available.");
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.userInvitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.EXPIRED },
    });
    throw new Error("Invitation has expired.");
  }

  const passwordHash = await hashPassword(password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        tenantId: invitation.tenantId,
        email: invitation.email,
        name: invitation.name || invitation.email,
        phone: phone || null,
        role: invitation.role,
        status: UserStatus.ACTIVE,
        passwordHash,
      },
    });

    await tx.userInvitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
        acceptedByUserId: user.id,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: invitation.tenantId,
        actorType: "user",
        actorUserId: user.id,
        eventType: "STAFF_INVITATION_ACCEPTED",
        referenceType: "user_invitation",
        referenceId: invitation.id,
        inputSnapshotJson: {
          token,
        },
        outputSnapshotJson: {
          userId: user.id,
          role: user.role,
        },
      },
    });

    return { invitation, user };
  });
}

async function ensureUniqueTenantSlug(baseSlug: string) {
  let slug = baseSlug || `tenant-${randomBytes(4).toString("hex")}`;
  let counter = 1;

  while (await prisma.tenant.findUnique({ where: { slug } })) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
}
