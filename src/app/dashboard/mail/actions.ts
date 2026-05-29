"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ClientLifecycleStage } from "@prisma/client";

const MAIL_COST_REGULAR = 4;
const MAIL_COST_CERTIFIED = 10;

export async function markMailed(
  clientId: string,
  tenantId: string,
  trackingNumber?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { mailPreference: true, tenantId: true },
    });

    if (!client) return { ok: false, error: "Client not found" };
    if (client.tenantId !== tenantId) return { ok: false, error: "Tenant mismatch" };

    const isCertified = (client.mailPreference ?? "REGULAR") === "CERTIFIED";
    const tokenCost = isCertified ? MAIL_COST_CERTIFIED : MAIL_COST_REGULAR;

    // Certified mail REQUIRES a tracking number
    if (isCertified && !trackingNumber?.trim()) {
      return { ok: false, error: "Tracking number is required for certified mail." };
    }

    if (tokenCost > 0) {
      const account = await prisma.mailTokenAccount.findUnique({
        where: { tenantId },
      });

      if (!account) {
        return { ok: false, error: "No mailing token account found. Please contact support." };
      }

      const available = account.includedBalance + account.purchasedBalance - account.usedBalance;

      if (available < tokenCost) {
        return { ok: false, error: `Insufficient mailing token balance (need ${tokenCost}, have ${available})` };
      }

      // Deduct from includedBalance first, then purchasedBalance
      const fromIncluded = Math.min(account.includedBalance, tokenCost);
      const fromPurchased = tokenCost - fromIncluded;

      await prisma.mailTokenAccount.update({
        where: { tenantId },
        data: {
          includedBalance: fromIncluded > 0 ? { decrement: fromIncluded } : undefined,
          purchasedBalance: fromPurchased > 0 ? { increment: fromPurchased } : undefined,
          usedBalance: { increment: tokenCost },
        },
      });
    }

    await prisma.client.update({
      where: { id: clientId },
      data: {
        lifecycleStage: ClientLifecycleStage.MAIL_SENT,
        trackingNumber: trackingNumber?.trim() || null,
        mailSentAt: new Date(),
      },
    });

    revalidatePath("/dashboard/mail");
    revalidatePath("/dashboard/mail-expenses");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
