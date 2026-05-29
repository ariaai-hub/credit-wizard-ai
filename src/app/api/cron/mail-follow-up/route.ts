import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CRON_SECRET = process.env.CRON_SECRET ?? "kestrel-cron-2026";

const MAIL_COST_REGULAR = 4;
const MAIL_COST_CERTIFIED = 10;

// Urgency tiers: hoursSinceQueued → message
const ESCALATION_TIERS = [
  {
    hours: 24,
    priority: "normal",
    messages: [
      `Hey — just a heads up that you have letters waiting in your mail queue. Take a look when you get a chance and let us know if you need anything before we ship.`,
      `Quick note — your mail queue has items ready to go. Reply here if you have any questions before we process them.`,
    ],
  },
  {
    hours: 48,
    priority: "attention",
    messages: [
      `Hey — wanted to check in. Your mail queue has items that have been waiting for a few days now. If you're ready to ship, just reply and we'll get them out. Need to top up tokens first? Let us know and we'll help you sort that.`,
      `Just a friendly nudge — your mail queue has items waiting. They've been there a couple days now. Let us know if you need to add more tokens or if there's anything else before we send them out.`,
    ],
  },
  {
    hours: 72,
    priority: "urgent",
    messages: [
      `Hey — following up on your mail queue. Items have been sitting there for a few days now. If you're ready to go, reply and we'll ship them out today. If tokens are the hold-up, we can help you add more right away.`,
      `Just checking in — your letters are still waiting in the queue. We can get them shipped out as soon as you're ready. Reply here and we'll take care of it.`,
    ],
  },
  {
    hours: 168, // 7 days
    priority: "critical",
    messages: [
      `Hey — your mail queue has items that have been waiting over a week now. Let's get these shipped out. If you need to add tokens or have any blockers, reply here immediately and we'll sort it out.`,
      `Following up on your mail queue — items have been waiting over a week. Please reply here ASAP so we can resolve anything in the way and get them shipped.`,
    ],
  },
];

function getTokenCost(client: { mailPreference: string }): number {
  return client.mailPreference === "CERTIFIED" ? MAIL_COST_CERTIFIED : MAIL_COST_REGULAR;
}

async function queueBotMessage(tenantId: string, clientId: string, content: string) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "ChatMessage" ("id", "tenantId", "clientId", "role", "content", "status", "createdAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3::"ChatMessageRole", $4, $5::"ChatMessageStatus", NOW())`,
    tenantId, clientId, "BOT", content, "PENDING"
  );
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const results: Record<string, unknown>[] = [];

    // Find all companies with clients stuck in MAIL_QUEUED
    const stuckClients = await prisma.$queryRawUnsafe<{
      id: string;
      tenantId: string;
      tenantName: string;
      firstName: string;
      email: string;
      mailPreference: string;
      updatedAt: Date;
      queuedhours: number;
    }[]>(`
      SELECT
        c.id,
        c."tenantId",
        t.name as "tenantName",
        c."firstName" as "firstName",
        c.email,
        c."mailPreference" as "mailPreference",
        c."updatedAt" as "updatedAt",
        EXTRACT(EPOCH FROM (NOW() - c."updatedAt")) / 3600 as queuedhours
      FROM "Client" c
      JOIN "Tenant" t ON t.id = c."tenantId"
      WHERE c."lifecycleStage" = 'MAIL_QUEUED'
        AND t.status IN ('ACTIVE', 'GRACE')
      ORDER BY queuedhours DESC
      LIMIT 100
    `);

    // Group by tenant for batching
    const byTenant = stuckClients.reduce<Record<string, typeof stuckClients>>((acc, c) => {
      if (!acc[c.tenantId]) acc[c.tenantId] = [];
      acc[c.tenantId].push(c);
      return acc;
    }, {});

    for (const [tenantId, clients] of Object.entries(byTenant)) {
      const tenantName = clients[0]?.tenantName ?? "your account";

      // Check tenant's token balance
      const account = await prisma.mailTokenAccount.findUnique({ where: { tenantId } });
      const totalTokens = account
        ? (account.includedBalance + account.purchasedBalance - account.usedBalance)
        : 0;

      // Sum up token cost for all queued clients
      const totalCost = clients.reduce((sum, c) => sum + getTokenCost(c), 0);
      const hasTokens = totalTokens >= totalCost;
      const hoursStuck = clients[0]?.queuedhours ?? 0;

      // Find the right escalation tier
      const tier = ESCALATION_TIERS.find((t) => hoursStuck >= t.hours) ?? ESCALATION_TIERS[0];
      const msgIndex = Math.floor(hoursStuck / (tier.hours || 24)) % tier.messages.length;
      const baseMessage = tier.messages[msgIndex];

      let message: string;
      if (!hasTokens) {
        message = `${baseMessage} NOTE: Your account currently has ${totalTokens} mailing tokens available. You'll need to add more tokens before these letters can be shipped. Visit your billing page to top up.`;
      } else {
        message = `${baseMessage} Good news — you have ${totalTokens} tokens available. These letters are ready to ship. Reply here and we'll process them today.`;
      }

      // Queue a message to each stuck client
      for (const client of clients.slice(0, 5)) { // cap at 5 per tenant per run
        await queueBotMessage(tenantId, client.id, message.replace("your mail queue", `your mail queue (${clients.length} item${clients.length !== 1 ? "s" : ""})`));
        results.push({
          tenantId,
          tenantName,
          clientId: client.id,
          queuedHours: Math.round(hoursStuck),
          priority: tier.priority,
          hasTokens,
          messageSnippet: message.substring(0, 60),
        });
      }
    }

    return NextResponse.json({
      triggeredAt: now.toISOString(),
      companiesAffected: Object.keys(byTenant).length,
      totalMessagesSent: results.length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    note: "POST only. Requires x-cron-secret header. Runs every 12 hours via Vercel cron.",
    tiers: ESCALATION_TIERS.map((t) => ({ hours: t.hours, priority: t.priority })),
  });
}
