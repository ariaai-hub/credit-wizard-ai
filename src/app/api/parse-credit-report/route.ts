import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCreditHeroPdf } from "@/lib/credit-hero-parser";
import { generateDisputeLetter } from "@/lib/letter-generator";
import type { Bureau } from "@/lib/bureau-addresses";
import { ClientLifecycleStage, DisputeTradelineStatus, DisputeCaseStatus } from "@prisma/client";

export async function POST(request: Request) {
  const session = await getSession();

  let tenantId: string;
  let clientId: string;

  // Auth: either session OR onboarding token
  if (session) {
    tenantId = session.tenantId;
    clientId = request.headers.get("x-client-id") ?? "";
  } else {
    const onboardingToken = request.headers.get("x-onboarding-token");
    if (!onboardingToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Dynamic import to avoid SSR issues
    const { verifyOnboardingToken } = await import("@/lib/client-access");
    const payload = await verifyOnboardingToken(onboardingToken);
    if (!payload) {
      return NextResponse.json({ error: "Invalid onboarding token" }, { status: 401 });
    }
    tenantId = payload.tenantId;
    clientId = payload.clientId;
  }

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Verify client belongs to tenant
    const client = await prisma.client.findFirst({
      where: { id: clientId, tenantId },
      include: { tenant: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Parse PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await parseCreditHeroPdf(buffer);

    // Create or get dispute case
    let disputeCase = await prisma.disputeCaseRecord.findUnique({
      where: { tenantId_clientId: { tenantId, clientId } },
    });

    if (!disputeCase) {
      disputeCase = await prisma.disputeCaseRecord.create({
        data: {
          tenantId,
          clientId,
          status: DisputeCaseStatus.DRAFT,
          primaryGoal: "delete_or_correct",
        },
      });
    }

    // Process negative tradelines (status !== GOOD)
    const negativeTradelines = parsed.tradelines.filter((tl) => tl.status !== "GOOD");

    for (const tradeline of negativeTradelines) {
      const bureau = (tradeline.bureau as Bureau) ?? "EQUIFAX";

      // Determine account type from category
      let accountType = "OTHER";
      if (tradeline.category === "CREDIT_CARD") accountType = "CREDIT_CARD";
      else if (tradeline.category === "AUTO_LOAN") accountType = "AUTO_LOAN";
      else if (tradeline.category === "STUDENT_LOAN") accountType = "STUDENT_LOAN";

      // Generate dispute letter for this bureau
      const letterText = generateDisputeLetter(
        {
          firstName: client.firstName,
          lastName: client.lastName,
          dateOfBirth: client.dateOfBirth,
          ssnLast4: client.ssnLast4,
        },
        tradeline,
        bureau,
      );

      await prisma.disputeTradelineRecord.create({
        data: {
          disputeCaseId: disputeCase.id,
          status: DisputeTradelineStatus.NEW,
          bureau: bureau,
          targetType: accountType,
          accountNumberMasked: tradeline.accountNumber
            ? `****${tradeline.accountNumber.slice(-4)}`
            : "N/A",
          accountType: accountType,
          theoryPrimary: "accuracy",
          remedyPrimary: "deletion",
          furnisherName: tradeline.creditor,
          collectorName: tradeline.creditor,
          originalCreditor: tradeline.creditor,
          balance: tradeline.balance ?? 0,
          scoresJson: {},
          specialLane: "standard",
          precisePriorCraDispute: false,
          directFurnisherSufficiencyPassed: false,
          knownAccurate: false,
          letterText,
        },
      });
    }

    // Update client lifecycle to MAIL_QUEUED
    await prisma.client.update({
      where: { id: clientId },
      data: { lifecycleStage: ClientLifecycleStage.MAIL_QUEUED },
    });

    return NextResponse.json({
      ok: true,
      tradelinesProcessed: parsed.tradelines.length,
      negativesFound: negativeTradelines.length,
      scores: parsed.scores,
      collectionsFound: parsed.collections.length,
    });
  } catch (error) {
    console.error("parse-credit-report error:", error);
    return NextResponse.json(
      { error: "PDF parsing failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}