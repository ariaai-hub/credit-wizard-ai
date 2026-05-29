import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyOnboardingToken } from "@/lib/client-access";

const consumerOnboardingSchema = z.object({
  token: z.string().min(1),
  personalInfo: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.string().min(1),
    phone: z.string().optional(),
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(5),
  }),
  creditGoal: z.object({
    mainGoal: z.enum(["remove_collections", "fix_errors", "improve_score", "all"]),
    bureausChecked: z.array(z.enum(["EQUIFAX", "EXPERIAN", "TRANSUNION", "NOT_SURE"])),
  }),
  reportSource: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = consumerOnboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body.", details: parsed.error.flatten() }, { status: 400 });
    }

    const { token, personalInfo, creditGoal, reportSource } = parsed.data;

    // Verify onboarding token
    const payload = await verifyOnboardingToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired onboarding link." }, { status: 401 });
    }

    const { clientId, tenantId } = payload;

    // Update client with personal info
    await prisma.client.update({
      where: { id: clientId },
      data: {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        dateOfBirth: personalInfo.dateOfBirth,
        phone: personalInfo.phone ?? null,
        address: personalInfo.address,
        city: personalInfo.city,
        clientState: personalInfo.state,
        zip: personalInfo.zip,
        onboardingSource: reportSource ?? null,
        onboardingGoal: creditGoal.mainGoal,
        bureausChecked: creditGoal.bureausChecked.join(","),
        onboardingCompletedAt: new Date(),
      },
    });

    // Generate portal URL
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    const portalToken = Buffer.from(`${clientId}:${Date.now()}`).toString("base64url");
    const portalUrl = `/client/${clientId}?token=${portalToken}`;

    return NextResponse.json({ success: true, portalUrl }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[api/client/consumer-onboarding]", message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
