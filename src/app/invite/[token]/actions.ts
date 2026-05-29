"use server";

import { redirect } from "next/navigation";

import { setSession } from "@/lib/auth";
import { acceptStaffInvitation } from "@/lib/tenant";

export async function acceptInvitationAction(token: string, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const phone = String(formData.get("phone") ?? "");

  const { user } = await acceptStaffInvitation({
    token,
    password,
    phone: phone || undefined,
  });

  await setSession({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  });

  redirect("/dashboard");
}
