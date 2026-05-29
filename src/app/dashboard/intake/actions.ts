"use server";

import { ClientLifecycleStage } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { ensureDisputeCaseForClient, runDisputeCaseEngine } from "@/lib/dispute-runtime";
import { sendClientProviderSignupEmail, sendClientProviderSignupSms } from "@/lib/invite-delivery";
import { syncClientToIntegrations } from "@/lib/integrations";
import { updateClientLifecycleStage, updateClientProviderSignupState } from "@/lib/intake";
import { addManualTradelineImport, createCreditReportImport } from "@/lib/report-imports";

const allowedRoles = new Set(["OWNER", "ADMIN", "SUPPORT", "ANALYST"]);

export async function updateClientStageAction(clientId: string, formData: FormData) {
  const session = await requireSession();

  if (!allowedRoles.has(session.role)) {
    throw new Error("You do not have permission to update intake stages.");
  }

  const lifecycleStage = String(formData.get("lifecycleStage") ?? "") as ClientLifecycleStage;

  if (!Object.values(ClientLifecycleStage).includes(lifecycleStage)) {
    throw new Error("Invalid lifecycle stage.");
  }

  await updateClientLifecycleStage({
    tenantId: session.tenantId,
    clientId,
    lifecycleStage,
    actorUserId: session.userId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/intake");
}

export async function syncClientAction(clientId: string) {
  const session = await requireSession();

  if (!allowedRoles.has(session.role)) {
    throw new Error("You do not have permission to sync clients.");
  }

  await syncClientToIntegrations({
    tenantId: session.tenantId,
    clientId,
    actorUserId: session.userId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/intake");
  revalidatePath("/dashboard/integrations");
}

export async function updateClientProviderSignupAction(clientId: string, formData: FormData) {
  const session = await requireSession();

  if (!allowedRoles.has(session.role)) {
    throw new Error("You do not have permission to update provider signup state.");
  }

  const action = String(formData.get("providerSignupAction") ?? "");

  if (!["mark_sent", "mark_completed", "reset"].includes(action)) {
    throw new Error("Invalid provider signup action.");
  }

  await updateClientProviderSignupState({
    tenantId: session.tenantId,
    clientId,
    actorUserId: session.userId,
    action: action as "mark_sent" | "mark_completed" | "reset",
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/intake");
  revalidatePath("/dashboard/integrations");
}

export async function sendClientProviderSignupEmailAction(clientId: string) {
  const session = await requireSession();

  if (!allowedRoles.has(session.role)) {
    throw new Error("You do not have permission to send provider signup emails.");
  }

  const deliveryResult = await sendClientProviderSignupEmail({
    tenantId: session.tenantId,
    clientId,
    actorUserId: session.userId,
  });

  if (deliveryResult.status === "sent") {
    await updateClientProviderSignupState({
      tenantId: session.tenantId,
      clientId,
      actorUserId: session.userId,
      action: "mark_sent",
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/intake");
  revalidatePath("/dashboard/integrations");
}

export async function sendClientProviderSignupSmsAction(clientId: string) {
  const session = await requireSession();

  if (!allowedRoles.has(session.role)) {
    throw new Error("You do not have permission to send provider signup SMS messages.");
  }

  const deliveryResult = await sendClientProviderSignupSms({
    tenantId: session.tenantId,
    clientId,
    actorUserId: session.userId,
  });

  if (deliveryResult.status === "sent") {
    await updateClientProviderSignupState({
      tenantId: session.tenantId,
      clientId,
      actorUserId: session.userId,
      action: "mark_sent",
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/intake");
  revalidatePath("/dashboard/integrations");
}

export async function prepareDisputeCaseAction(clientId: string) {
  const session = await requireSession();

  if (!allowedRoles.has(session.role)) {
    throw new Error("You do not have permission to prepare dispute cases.");
  }

  await ensureDisputeCaseForClient({
    tenantId: session.tenantId,
    clientId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/intake");
}

export async function runDisputeCaseAction(disputeCaseId: string) {
  const session = await requireSession();

  if (!allowedRoles.has(session.role)) {
    throw new Error("You do not have permission to run dispute cases.");
  }

  await runDisputeCaseEngine({
    tenantId: session.tenantId,
    disputeCaseId,
    triggeredBy: session.userId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/intake");
  revalidatePath("/dashboard/audit");
}

export async function uploadCreditReportAction(clientId: string, formData: FormData) {
  const session = await requireSession();

  if (!allowedRoles.has(session.role)) {
    throw new Error("You do not have permission to upload credit reports.");
  }

  const file = formData.get("reportFile");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Attach a credit report file before uploading.");
  }

  await createCreditReportImport({
    tenantId: session.tenantId,
    clientId,
    actorUserId: session.userId,
    file,
    sourceType: "STAFF_UPLOAD",
    providerLabel: String(formData.get("providerLabel") ?? "manual_upload"),
    notes: String(formData.get("reportNotes") ?? ""),
    reportPulledAt: String(formData.get("reportPulledAt") ?? ""),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/intake");
  revalidatePath("/dashboard/audit");
}

export async function addManualTradelineAction(clientId: string, formData: FormData) {
  const session = await requireSession();

  if (!allowedRoles.has(session.role)) {
    throw new Error("You do not have permission to add tradelines.");
  }

  await addManualTradelineImport({
    tenantId: session.tenantId,
    clientId,
    actorUserId: session.userId,
    bureau: String(formData.get("bureau") ?? ""),
    targetType: String(formData.get("targetType") ?? ""),
    accountNumberMasked: String(formData.get("accountNumberMasked") ?? ""),
    accountType: String(formData.get("accountType") ?? ""),
    theoryPrimary: String(formData.get("theoryPrimary") ?? ""),
    remedyPrimary: String(formData.get("remedyPrimary") ?? ""),
    furnisherName: String(formData.get("furnisherName") ?? ""),
    balance: Number(formData.get("balance") ?? 0) || undefined,
    pastDue: Number(formData.get("pastDue") ?? 0) || undefined,
    monthlyPayment: Number(formData.get("monthlyPayment") ?? 0) || undefined,
    sourceLabel: String(formData.get("sourceLabel") ?? "manual_operator_entry"),
    notes: String(formData.get("tradelineNotes") ?? ""),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/intake");
  revalidatePath("/dashboard/audit");
}
