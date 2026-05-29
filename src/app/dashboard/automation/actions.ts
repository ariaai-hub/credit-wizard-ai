"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { runProviderSignupFollowUps } from "@/lib/provider-followups";

const allowedRoles = new Set(["OWNER", "ADMIN", "SUPPORT", "ANALYST"]);

export async function runProviderSignupFollowUpsAction(formData: FormData) {
  const session = await requireSession();

  if (!allowedRoles.has(session.role)) {
    throw new Error("You do not have permission to run follow-up automation.");
  }

  const mode = String(formData.get("mode") ?? "dry_run");
  const dryRun = mode !== "live";

  await runProviderSignupFollowUps({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    dryRun,
    actorType: "USER",
    trigger: "dashboard_manual",
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/automation");
  revalidatePath("/dashboard/intake");
  revalidatePath("/dashboard/audit");
}
