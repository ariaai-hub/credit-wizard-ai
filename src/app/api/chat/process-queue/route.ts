import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAIResponse } from "@/lib/chat-ai";

function getCronSecret(): string {
  const s = process.env.CRON_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") throw new Error("CRON_SECRET required in production");
    console.warn("[CRON] CRON_SECRET not set — using dev fallback");
    return "dev-insecure-cron-fallback";
  }
  return s;
}
const CRON_SECRET = process.env.CRON_SECRET ?? "dev-insecure-cron-fallback";

// Detect if a client message mentions a specific date/time they can do something
function parseFollowUpFromMessage(content: string): Date | null {
  const lower = content.toLowerCase();
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d;
  }
  if (/\bnext week\b/.test(lower)) {
    const d = new Date();
    const day = d.getDay(); const daysUntilMonday = day === 0 ? 1 : 8 - day;
    d.setDate(d.getDate() + daysUntilMonday); d.setHours(9, 0, 0, 0); return d;
  }
  const dayMap: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  for (const [dayName, dayNum] of Object.entries(dayMap)) {
    if (new RegExp(`\\b${dayName}\\b`).test(lower)) {
      const d = new Date();
      let daysUntil = dayNum - d.getDay(); if (daysUntil <= 0) daysUntil += 7;
      if (daysUntil === 0) daysUntil = 7;
      d.setDate(d.getDate() + daysUntil); d.setHours(9, 0, 0, 0); return d;
    }
  }
  const inDaysMatch = lower.match(/in\s+(a\s+)?(few|couple|(\d+))\s+days?/);
  if (inDaysMatch) {
    let days = inDaysMatch[3] ? parseInt(inDaysMatch[3]) : inDaysMatch[1] ? 3 : 2;
    const d = new Date(); d.setDate(d.getDate() + days); d.setHours(9, 0, 0, 0); return d;
  }
  return null;
}
const MIN_DELAY_MS = 90_000; // 90 seconds — no instant replies

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - MIN_DELAY_MS);

    // Find messages that have been waiting long enough
    const pendingMessages = await prisma.chatMessage.findMany({
      where: {
        status: "PENDING",
        createdAt: { lt: cutoff },
      },
      orderBy: { createdAt: "asc" },
      take: 5, // Process up to 5 at a time
    });

    if (pendingMessages.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    const results: { messageId: string; ok: boolean; escalated: boolean; error?: string }[] = [];

    for (const msg of pendingMessages) {
      try {
        const { response, escalated } = await generateAIResponse(
          msg.clientId,
          msg.tenantId,
          msg.id,
        );

        // Store the AI response as a new BOT message
        await prisma.chatMessage.create({
          data: {
            tenantId: msg.tenantId,
            clientId: msg.clientId,
            role: escalated ? "STAFF" : "BOT",
            content: response,
            status: escalated ? "ESCALATED" : "SENT",
            
            sentAt: new Date(),
          },
        });

        // Mark original as processed
        await prisma.chatMessage.update({
          where: { id: msg.id },
          data: { status: "SENT", sentAt: new Date() },
        });

        // Detect follow-up time in client message
        const followUpTime = parseFollowUpFromMessage(msg.content);
        if (followUpTime) {
          // Client said they'd do it at a specific time — schedule a follow-up
          const followUpMsg = `Got it! I'll follow up with you ${followUpTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} to help you finish up. No rush between now and then — just wanted to put it on the calendar.`;
          await prisma.$executeRawUnsafe(
            `INSERT INTO "ScheduledFollowUp" ("id", "clientId", "tenantId", "scheduledAt", "message", "status", "createdAt")
             VALUES (gen_random_uuid()::text, $1, $2, $3, $4, 'PENDING'::text, NOW())`,
            msg.clientId, msg.tenantId, followUpTime, followUpMsg
          );
        }

        // If escalated, also notify the tenant owner via audit log
        if (escalated) {
          await prisma.auditLog.create({
            // @ts-ignore
            data: {
              tenantId: msg.tenantId,
              eventType: "CHAT_ESCALATION",
              referenceType: "ChatMessage",
              referenceId: msg.id,
              inputSnapshotJson: { originalMessage: msg.content, escalatedResponse: response } as any,
            },
          });
        }

        results.push({ messageId: msg.id, ok: true, escalated });
      } catch (e: any) {
        await prisma.chatMessage.update({
          where: { id: msg.id },
          data: { status: "FAILED", errorMessage: e.message },
        });
        results.push({ messageId: msg.id, ok: false, escalated: false, error: e.message });
      }
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Also allow GET for easy testing / ping
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.get("secret") !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Trigger the same processing logic
  const pendingMessages = await prisma.chatMessage.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  return NextResponse.json({
    ok: true,
    pendingCount: pendingMessages.length,
    sample: pendingMessages.slice(0, 2).map((m) => ({
      id: m.id,
      clientId: m.clientId,
      content: m.content,
      age_seconds: Math.round((Date.now() - m.createdAt.getTime()) / 1000),
    })),
  });
}
