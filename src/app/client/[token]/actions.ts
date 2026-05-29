"use server";

import { revalidatePath } from "next/cache";

import {
  saveClientPortalFundingPreferences,
  saveClientPortalReportEligibility,
  submitClientPortalDocument,
  submitClientPortalSupportMessage,
} from "@/lib/client-access";

export async function submitClientPortalDocumentAction(token: string, formData: FormData) {
  const documentType = String(formData.get("documentType") ?? "general_document");
  const notes = String(formData.get("notes") ?? "");
  const file = formData.get("document");

  if (!(file instanceof File)) {
    throw new Error("Please attach a file before submitting.");
  }

  await submitClientPortalDocument({
    token,
    documentType,
    notes,
    file,
  });

  revalidatePath(`/client/${token}`);
}

export async function submitClientPortalReportEligibilityAction(token: string, formData: FormData) {
  const reportedIdentityTheft = formData.get("reportedIdentityTheft") === "on";
  const identityTheftNarrative = String(formData.get("identityTheftNarrative") ?? "");
  const disputedWithCreditBureaus = formData.get("disputedWithCreditBureaus") === "on";
  const authorizedFtcIdentityTheftReport = formData.get("authorizedFtcIdentityTheftReport") === "on";
  const authorizedCfpbComplaint = formData.get("authorizedCfpbComplaint") === "on";
  const authorizedBbbComplaint = formData.get("authorizedBbbComplaint") === "on";

  await saveClientPortalReportEligibility({
    token,
    reportedIdentityTheft,
    identityTheftNarrative,
    disputedWithCreditBureaus,
    authorizedFtcIdentityTheftReport,
    authorizedCfpbComplaint,
    authorizedBbbComplaint,
  });

  revalidatePath(`/client/${token}`);
}

export async function submitClientPortalFundingPreferencesAction(token: string, formData: FormData) {
  const fundingInterestPersonal = formData.get("fundingInterestPersonal") === "on";
  const fundingInterestBusiness = formData.get("fundingInterestBusiness") === "on";

  await saveClientPortalFundingPreferences({
    token,
    fundingInterestPersonal,
    fundingInterestBusiness,
  });

  revalidatePath(`/client/${token}`);
}

export async function submitClientPortalSupportMessageAction(token: string, formData: FormData) {
  const message = String(formData.get("message") ?? "");

  await submitClientPortalSupportMessage({
    token,
    message,
  });

  revalidatePath(`/client/${token}`);
}
