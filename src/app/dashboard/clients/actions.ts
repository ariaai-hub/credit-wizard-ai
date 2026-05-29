"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createOnboardingToken } from "@/lib/client-access";
import { prisma } from "@/lib/prisma";

export type CreateClientActionState = {
  ok: boolean;
  message: string;
  onboardingUrl?: string;
};

export async function createClientWithOnboardingLink(
  _previousState: CreateClientActionState,
  formData: FormData,
): Promise<CreateClientActionState> {
  try {
    const session = await requireSession();

    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const phone = String(formData.get("phone") ?? "").trim();
    const mailPreference = formData.get("mailPreference") === "CERTIFIED" ? "CERTIFIED" : "REGULAR";

    if (!firstName || !lastName) {
      return { ok: false, message: "First and last name are required." };
    }

    // Create the client record
    const client = await prisma.client.create({
      data: {
        tenantId: session.tenantId,
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        mailPreference,
        lifecycleStage: "INTAKE_RECEIVED",
      },
    });

    // Generate a 30-day onboarding token
    const onboardingToken = await createOnboardingToken({
      tenantId: session.tenantId,
      clientId: client.id,
    });

    // Store the token on the client record
    await prisma.client.update({
      where: { id: client.id },
      data: { onboardingToken },
    });

    revalidatePath("/dashboard/clients");

    const baseUrl = process.env.APP_BASE_URL ?? "https://credit-lounge-academy.vercel.app";
    const onboardingUrl = `${baseUrl}/client/onboarding/${onboardingToken}`;

    return {
      ok: true,
      message: `Onboarding link generated for ${firstName} ${lastName}.`,
      onboardingUrl,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not create client.",
    };
  }
}
