/**
 * POST /api/client/download-letter
 *
 * Paywall-gated letter PDF download for the client portal.
 * Checks tenant plan and Starter download limits before serving.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyClientPortalAccessToken } from "@/lib/client-access";
import type { Plan } from "@prisma/client";

const STARTER_MONTHLY_LIMIT = 3;

const downloadBodySchema = z.object({
  letterId: z.string().min(1),
});

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function buildLetterPdf(letterText: string, clientName: string, creditorName: string): Buffer {
  // Simple text-to-PDF via embedded printable HTML that the browser can print-to-PDF.
  // Returns a Buffer containing an HTML document the caller can serve as a PDF blob.
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Dispute Letter — ${creditorName}</title>
<style>
  body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.6; max-width: 800px; margin: 60px auto; padding: 0 40px; color: #111; }
  pre { white-space: pre-wrap; word-wrap: break-word; font-family: Georgia, serif; font-size: 12pt; line-height: 1.6; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<pre>${letterText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body>
</html>`;
  return Buffer.from(html, "utf-8");
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const body = await request.json().catch(() => ({}));
    const parsed = downloadBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request: letterId required." }, { status: 400 });
    }

    const { letterId } = parsed.data;
    const authHeader = request.headers.get("authorization");
    const clientPortalToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    // Support token in body for client-side calls
    const bodyToken: string | undefined = typeof body.token === "string" ? body.token : undefined;
    const token = clientPortalToken ?? bodyToken;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyClientPortalAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired access link." }, { status: 401 });
    }

    // ── Fetch tenant + plan ────────────────────────────────────────────────────
    const tenant = await prisma.tenant.findUnique({
      where: { id: payload.tenantId },
      select: { id: true, plan: true, letterDownloadsThisMonth: true, lastDownloadMonth: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    const plan = tenant.plan as Plan | null;
    const currentMonth = getCurrentMonth();

    // ── Plan gate ──────────────────────────────────────────────────────────────
    if (!plan) {
      return NextResponse.json(
        {
          allowed: false,
          reason: "upgrade_required",
          upgradePlan: "PRO",
          message: "No active plan. Upgrade to Pro or Elite to download letters.",
        },
        { status: 402 },
      );
    }

    // PRO and ELITE — unlimited downloads, no counter check
    if (plan === "PRO" || plan === "ELITE") {
      // Fetch the letter and stream it
      const letter = await prisma.disputeTradelineRecord.findFirst({
        where: {
          id: letterId,
          disputeCase: { tenantId: payload.tenantId, clientId: payload.clientId },
        },
        select: {
          id: true,
          letterText: true,
          furnisherName: true,
        },
      });

      if (!letter) {
        return NextResponse.json({ error: "Letter not found." }, { status: 404 });
      }

      if (!letter.letterText) {
        return NextResponse.json({ error: "Letter not yet generated." }, { status: 404 });
      }

      const client = await prisma.client.findUnique({
        where: { id: payload.clientId },
        select: { firstName: true, lastName: true },
      });

      const clientName = client ? `${client.firstName} ${client.lastName}` : "Client";
      const pdfBuffer = buildLetterPdf(letter.letterText, clientName, letter.furnisherName ?? "Creditor");

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="dispute-letter-${letter.furnisherName ?? "letter"}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // ── STARTER plan — check monthly counter ───────────────────────────────────
    if (plan === "STARTER") {
      // Reset counter if month changed
      const isNewMonth = tenant.lastDownloadMonth !== currentMonth;

      if (isNewMonth) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { letterDownloadsThisMonth: 0, lastDownloadMonth: currentMonth },
        });
      }

      const currentCount = isNewMonth ? 0 : (tenant.letterDownloadsThisMonth ?? 0);

      if (currentCount >= STARTER_MONTHLY_LIMIT) {
        return NextResponse.json(
          {
            allowed: false,
            reason: "limit_reached",
            upgradePlan: "PRO",
            downloadsUsed: currentCount,
            downloadsLimit: STARTER_MONTHLY_LIMIT,
            message: `You've used all ${STARTER_MONTHLY_LIMIT} Starter downloads for this month. Upgrade to Pro for unlimited letters.`,
          },
          { status: 402 },
        );
      }

      // Fetch letter
      const letter = await prisma.disputeTradelineRecord.findFirst({
        where: {
          id: letterId,
          disputeCase: { tenantId: payload.tenantId, clientId: payload.clientId },
        },
        select: {
          id: true,
          letterText: true,
          furnisherName: true,
        },
      });

      if (!letter) {
        return NextResponse.json({ error: "Letter not found." }, { status: 404 });
      }

      if (!letter.letterText) {
        return NextResponse.json({ error: "Letter not yet generated." }, { status: 404 });
      }

      const client = await prisma.client.findUnique({
        where: { id: payload.clientId },
        select: { firstName: true, lastName: true },
      });

      const clientName = client ? `${client.firstName} ${client.lastName}` : "Client";
      const pdfBuffer = buildLetterPdf(letter.letterText, clientName, letter.furnisherName ?? "Creditor");

      // Increment counter (always update lastDownloadMonth on a successful download)
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          letterDownloadsThisMonth: { increment: 1 },
          lastDownloadMonth: currentMonth,
        },
      });

      // Audit log — no PII beyond letterId + tenantId
      await prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorType: "client_portal",
          eventType: "LETTER_DOWNLOADED",
          referenceType: "dispute_tradeline",
          referenceId: letterId,
          inputSnapshotJson: { letterId },
          outputSnapshotJson: { plan, month: currentMonth, countAfter: currentCount + 1 },
        },
      });

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="dispute-letter-${letter.furnisherName ?? "letter"}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // Fallback — unknown plan
    return NextResponse.json(
      { allowed: false, reason: "upgrade_required", upgradePlan: "PRO", message: "Unknown plan. Please upgrade." },
      { status: 402 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed." },
      { status: 500 },
    );
  }
}
