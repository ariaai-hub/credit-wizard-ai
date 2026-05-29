"use server";

import { SubscriptionStatus } from "@prisma/client";

import { setSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SignInActionState = {
  ok: boolean;
  message: string;
  redirectUrl?: string;
};

const ACCESS_RECOVERY_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.GRACE,
  SubscriptionStatus.PAST_DUE,
];

export async function signInAction(
  _previousState: SignInActionState,
  formData: FormData,
): Promise<SignInActionState> {
  try {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    const user = await prisma.user.findFirst({
      where: {
        email,
      },
      include: {
        tenant: {
          include: {
            subscriptions: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!user?.passwordHash) {
      return {
        ok: false,
        message: "Invalid email or password.",
      };
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return {
        ok: false,
        message: "Invalid email or password.",
      };
    }

    const latestSubscription = user.tenant.subscriptions[0] ?? null;
    const canRecoverLockedTenant =
      user.tenant.accessMode === "LOCKED" &&
      latestSubscription &&
      ACCESS_RECOVERY_STATUSES.includes(latestSubscription.status);

    if (user.tenant.accessMode === "LOCKED" && !canRecoverLockedTenant) {
      return {
        ok: false,
        message: "Finish billing setup first. Your sign-up is not active yet.",
      };
    }

    if (canRecoverLockedTenant) {
      await prisma.tenant.update({
        where: { id: user.tenantId },
        data: {
          status: latestSubscription.status === SubscriptionStatus.PAST_DUE ? "GRACE" : "ACTIVE",
          accessMode: latestSubscription.status === SubscriptionStatus.PAST_DUE ? "READ_ONLY" : "READ_WRITE",
        },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await setSession({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });

    return {
      ok: true,
      message: "Signing you in...",
      redirectUrl: "/dashboard",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not sign in.",
    };
  }
}
