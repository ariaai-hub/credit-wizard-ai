import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lazy — read on first call, not at module load time
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
const REMINDER_GAP_HOURS = 12;
const MAX_CLIENTS_PER_RUN = 50;

/**
 * Onboarding Reminder Cron
 *
 * Fires every minute via Vercel cron (configured in vercel.json).
 *
 * Finds clients who:
 *   1. Are in INTAKE_RECEIVED lifecycle stage (onboarding link sent, not completed)
 *   2. Have onboardingSentAt > 12 hours ago  (client record createdAt as proxy)
 *   3. Haven't been reminded in the last 12 hours (lastReminderAt OR updatedAt as proxy)
 *
 * For each stale client: creates an AuditLog entry (CLIENT_ONBOARDING_STALE)
 * so staff can follow up via their own channel. No email/SMS from this cron.
 *
 * After creating audit log, updates the client's updatedAt as a proxy for lastReminderAt.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const reminderGapMs = REMINDER_GAP_HOURS * 60 * 60 * 1000;
    const reminderCutoff = new Date(now.getTime() - reminderGapMs);
    const twelveHoursAgo = new Date(now.getTime() - reminderGapMs);

    const results: {
      clientId: string;
      firstName: string;
      email: string | null;
      hoursSinceCreated: number;
      auditLogId: string;
    }[] = [];

    // Find clients stuck in INTAKE_RECEIVED who received their onboarding link
    // more than 12 hours ago and haven't been reminded in the last 12 hours.
    //
    // Since we don't have onboardingSentAt or lastReminderAt fields, we use:
    //   - createdAt  as proxy for when the onboarding link was generated
    //   - updatedAt  as proxy for lastReminderAt (we update it after each alert)
    const staleClients = await prisma.$queryRawUnsafe<{
      id: string;
      tenantid: string;
      firstname: string;
      lastname: string;
      email: string | null;
      createdat: Date;
      updatedat: Date;
    }[]>(
      `SELECT
         c.id,
         c."tenantId",
         c."firstName",
         c."lastName",
         c.email,
         c."createdAt",
         c."updatedAt"
       FROM "Client" c
       WHERE c."lifecycleStage" = 'INTAKE_RECEIVED'
         AND c."onboardingCompletedAt" IS NULL
         AND c."createdAt" < $1          -- link sent more than 12h ago
         AND c."updatedAt" < $2          -- not reminded in last 12h
       ORDER BY c."createdAt" ASC
       LIMIT $3`,
      twelveHoursAgo,
      reminderCutoff,
      MAX_CLIENTS_PER_RUN
    );

    for (const client of staleClients) {
      const hoursSinceCreated = Math.round(
        (now.getTime() - client.createdat.getTime()) / (1000 * 60 * 60)
      );

      // Create staff alert via AuditLog
      // actorType is required; use SYSTEM for automated cron alerts
      const auditLog = await prisma.auditLog.create({
        data: {
          tenantId: client.tenantid,
          actorType: "SYSTEM",
          eventType: "CLIENT_ONBOARDING_STALE",
          referenceType: "client",
          referenceId: client.id,
          inputSnapshotJson: {
            clientFirstName: client.firstname,
            clientLastName: client.lastname,
            clientEmail: client.email,
            hoursSinceCreated,
            message:
              `Onboarding link sent to ${client.firstname} ${client.lastname}` +
              ` (${client.email ?? "no email"}) ${hoursSinceCreated}h ago — no completion.` +
              ` Staff should follow up via their own channel (email/SMS/phone).` +
              ` Once client completes onboarding they can reply via the portal chat.`,
          } as any,
        },
      });

      // Update updatedAt as a proxy for lastReminderAt so we don't re-alert within 12h
      await prisma.$executeRawUnsafe(
        `UPDATE "Client" SET "updatedAt" = NOW() WHERE id = $1`,
        client.id
      );

      results.push({
        clientId: client.id,
        firstName: client.firstname,
        email: client.email,
        hoursSinceCreated,
        auditLogId: auditLog.id,
      });
    }

    return NextResponse.json({
      triggeredAt: now.toISOString(),
      reminderGapHours: REMINDER_GAP_HOURS,
      maxClientsPerRun: MAX_CLIENTS_PER_RUN,
      clientsProcessed: results.length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    note: "POST only. Requires x-cron-secret header. Fires every minute via Vercel cron.",
    reminderGapHours: REMINDER_GAP_HOURS,
    maxClientsPerRun: MAX_CLIENTS_PER_RUN,
    description:
      "Finds clients in INTAKE_RECEIVED status with onboarding link sent >12h ago " +
      "and no reminder in last 12h. Creates AuditLog entries (CLIENT_ONBOARDING_STALE) " +
      "for staff follow-up. Uses createdAt as proxy for onboardingSentAt, " +
      "updatedAt as proxy for lastReminderAt.",
  });
}