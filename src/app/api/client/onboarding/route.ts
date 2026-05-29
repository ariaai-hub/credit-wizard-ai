import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyOnboardingToken, createClientPortalAccessToken } from "@/lib/client-access";
import { prisma } from "@/lib/prisma";
import { ClientLifecycleStage } from "@prisma/client";

const booleanLike = z
  .union([z.boolean(), z.string(), z.number()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") return ["true", "1", "yes", "y", "on", "checked"].includes(value.trim().toLowerCase());
    return false;
  });

const onboardingSubmitSchema = z
  .object({
    token: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    reportedIdentityTheft: booleanLike,
    dateOfBirth: z.string().optional().or(z.literal("")),
    ssnLast4: z.string().optional().or(z.literal("")),
    identityTheftNarrative: z.string().optional(),
    disputedWithCreditBureaus: booleanLike,
    authorizedFtcIdentityTheftReport: booleanLike,
    authorizedCfpbComplaint: booleanLike,
    authorizedBbbComplaint: booleanLike,
    mailPreference: z.enum(["REGULAR", "CERTIFIED"]),
    fundingInterestPersonal: booleanLike,
    fundingInterestBusiness: booleanLike,
    creditReportUrl: z.string().url().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // DOB and SSN are required when identity theft = true
    if (data.reportedIdentityTheft) {
      if (!data.dateOfBirth) {
        ctx.addIssue({ code: "custom", message: "Date of birth is required when identity theft is reported.", path: ["dateOfBirth"] });
      }
      if (!data.ssnLast4 || data.ssnLast4.length !== 4) {
        ctx.addIssue({ code: "custom", message: "Last 4 of SSN is required when identity theft is reported.", path: ["ssnLast4"] });
      }
    }
  });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = onboardingSubmitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid form data.", detail: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { token, creditReportUrl, ...formData } = parsed.data;

    const payload = await verifyOnboardingToken(token);
    if (!payload) {
      return NextResponse.json({ ok: false, error: "Invalid or expired onboarding link." }, { status: 401 });
    }

    // Update client with form data
    await prisma.client.update({
      where: { id: payload.clientId },
      data: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || null,
        phone: formData.phone || null,
        reportedIdentityTheft: formData.reportedIdentityTheft,
        dateOfBirth: formData.reportedIdentityTheft ? formData.dateOfBirth || null : null,
        ssnLast4: formData.reportedIdentityTheft ? formData.ssnLast4 || null : null,
        identityTheftNarrative: formData.identityTheftNarrative || null,
        disputedWithCreditBureaus: formData.disputedWithCreditBureaus,
        authorizedFtcIdentityTheftReport: formData.authorizedFtcIdentityTheftReport,
        authorizedCfpbComplaint: formData.authorizedCfpbComplaint,
        authorizedBbbComplaint: formData.authorizedBbbComplaint,
        mailPreference: formData.mailPreference,
        fundingInterestPersonal: formData.fundingInterestPersonal,
        fundingInterestBusiness: formData.fundingInterestBusiness,
        creditReportUrl: creditReportUrl || null,
        onboardingCompletedAt: new Date(),
        lifecycleStage: ClientLifecycleStage.DOCS_PENDING,
      } as any,
    });

    // Generate portal access token
    const portalToken = await createClientPortalAccessToken({
      tenantId: payload.tenantId,
      clientId: payload.clientId,
    });

    const baseUrl = process.env.APP_BASE_URL ?? "https://credit-lounge-academy.vercel.app";
    const portalUrl = `${baseUrl}/client/${portalToken}`;

    return NextResponse.json({ ok: true, portalUrl });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Submission failed." },
      { status: 500 },
    );
  }
}
