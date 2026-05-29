import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: submit client feedback / rating for a bot message
export async function POST(request: NextRequest) {
  const session = await requireSession();
  const body = await request.json();
  const { messageId, feedbackRating, clientFeedback } = body;

  if (!messageId || feedbackRating === undefined) {
    return NextResponse.json({ error: "messageId and feedbackRating required" }, { status: 400 });
  }

  if (feedbackRating < 1 || feedbackRating > 5) {
    return NextResponse.json({ error: "feedbackRating must be 1-5" }, { status: 400 });
  }

  // Verify ownership
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { tenantId: true, role: true },
  });

  if (!message || message.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      feedbackRating,
      clientFeedback: clientFeedback || null,
    },
  });

  return NextResponse.json({ ok: true, id: updated.id });
}

// GET: fetch analytics summary for tenant
export async function GET(request: NextRequest) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30"), 90);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    totalBotMessages,
    escalatedMessages,
    ratedMessages,
    avgRating,
    recentActivity,
    topClientsByEscalations,
  ] = await Promise.all([
    // Total bot messages in window
    prisma.chatMessage.count({
      where: { tenantId: session.tenantId, role: "BOT", createdAt: { gte: since } },
    }),
    // Escalated messages
    prisma.chatMessage.count({
      where: { tenantId: session.tenantId, role: "BOT", wasEscalated: true, createdAt: { gte: since } },
    }),
    // Rated messages
    prisma.chatMessage.count({
      where: { tenantId: session.tenantId, role: "BOT", feedbackRating: { not: null }, createdAt: { gte: since } },
    }),
    // Average rating
    prisma.chatMessage.aggregate({
      where: { tenantId: session.tenantId, role: "BOT", feedbackRating: { not: null }, createdAt: { gte: since } },
      _avg: { feedbackRating: true },
    }),
    // Daily activity for chart
    prisma.chatMessage.groupBy({
      by: ["createdAt"],
      where: { tenantId: session.tenantId, role: "BOT", createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { createdAt: "asc" },
    }),
    // Top clients by escalation count
    prisma.chatMessage.groupBy({
      by: ["clientId"],
      where: { tenantId: session.tenantId, role: "BOT", wasEscalated: true, createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  // Get client names for top escalations
  const clientIds = topClientsByEscalations.map((e) => e.clientId);
  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));

  // Build daily buckets
  const buckets: Record<string, number> = {};
  for (const row of recentActivity) {
    const key = row.createdAt.toISOString().slice(0, 10);
    buckets[key] = (buckets[key] || 0) + row._count.id;
  }
  const dailyData = Object.entries(buckets).map(([date, count]) => ({ date, count }));

  // Rating distribution
  const ratingDist = await prisma.chatMessage.groupBy({
    by: ["feedbackRating"],
    where: { tenantId: session.tenantId, role: "BOT", feedbackRating: { not: null }, createdAt: { gte: since } },
    _count: { id: true },
  });

  const escalationRate = totalBotMessages > 0 ? Math.round((escalatedMessages / totalBotMessages) * 100) : 0;
  const avgRatingVal = avgRating._avg.feedbackRating ? Math.round(avgRating._avg.feedbackRating * 10) / 10 : null;

  return NextResponse.json({
    period: { days, since: since.toISOString() },
    totals: { botMessages: totalBotMessages, escalated: escalatedMessages, rated: ratedMessages },
    rates: { escalationRate, avgRating: avgRatingVal },
    dailyData,
    topEscalations: topClientsByEscalations.map((e) => ({
      clientId: e.clientId,
      clientName: clientMap[e.clientId] || "Unknown",
      escalationCount: e._count.id,
    })),
    ratingDistribution: ratingDist.map((r) => ({ rating: r.feedbackRating, count: r._count.id })),
  });
}
