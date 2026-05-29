"use server";

import { redirect } from "next/navigation";

import { setSession } from "@/lib/auth";
import { createTenantWithOwner } from "@/lib/tenant";

export async function createCompanyAction(formData: FormData) {
  const companyName = String(formData.get("companyName") ?? "");
  const ownerName = String(formData.get("ownerName") ?? "");
  const ownerEmail = String(formData.get("ownerEmail") ?? "");
  const ownerPhone = String(formData.get("ownerPhone") ?? "");
  const billingEmail = String(formData.get("billingEmail") ?? "");
  const companyPhone = String(formData.get("companyPhone") ?? "");
  const planKey = String(formData.get("planKey") ?? "starter") as "starter" | "growth" | "scale";
  const crcConfigRef = String(formData.get("crcConfigRef") ?? "");
  const creditProvider = String(formData.get("creditProvider") ?? "CREDIT_HERO") as "CREDIT_HERO" | "IDENTITYIQ";
  const creditProviderRef = String(formData.get("creditProviderRef") ?? "");
  const mailQueueDestination = String(formData.get("mailQueueDestination") ?? "");
  const password = String(formData.get("password") ?? "");

  const { tenant, owner } = await createTenantWithOwner({
    companyName,
    ownerName,
    ownerEmail,
    ownerPhone,
    billingEmail,
    companyPhone,
    planKey,
    crcConfigRef,
    creditProvider,
    creditProviderRef,
    mailQueueDestination,
    password,
  });

  await setSession({
    userId: owner.id,
    tenantId: tenant.id,
    role: owner.role,
    email: owner.email,
  });

  redirect("/dashboard");
}
