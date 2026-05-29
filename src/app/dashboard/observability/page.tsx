import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ObservabilityClient } from "./observability-client";

type Period = 7 | 14 | 30;

type MessageDay = { date: string; count: number };
type RatingBucket = { rating: number; count: number };
type ConversationRow = {
  clientId: string;
  clientName: string;
  messageCount: number;
  avgRating: number | null;
  hasEscalation: boolean;
  lastMessage: Date;
};

type Stats = {
  totalMessages: number;
  avgRating: number | null;
  escalationRate: number;
  activeClients: number;
  dailyData: MessageDay[];
  ratingDist: RatingBucket[];
  conversations: ConversationRow[];
};

async function fetchStats(tenantId: string, days: number): Promise<Stats> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [messages, conversationsWithStaff] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { tenantId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.chatMessage.groupBy({
      by: ["clientId"],
      where: { tenantId, role: "STAFF", createdAt: { gte: since } },
      _count: { id: true },
    }),
  ]);

  const staffClientIds = new Set(conversationsWithStaff.map((c) => c.clientId));

  // Total messages
  const totalMessages = messages.length;

  // Avg rating
  const ratedMessages = messages.filter((m) => m.feedbackRating != null);
  const avgRating =
    ratedMessages.length > 0
      ? Math.round(
          (ratedMessages.reduce((s, m) => s + (m.feedbackRating ?? 0), 0) /
            ratedMessages.length) *
            10
        ) / 10
      : null;

  // Escalation rate (% of conversations with any STAFF message)
  const distinctClientIds = new Set(messages.map((m) => m.clientId)).size;
  const escalatedClients = staffClientIds.size;
  const escalationRate =
    distinctClientIds > 0
      ? Math.round((escalatedClients / distinctClientIds) * 100)
      : 0;

  // Active clients
  const activeClients = distinctClientIds;

  // Daily data — group by date string
  const dailyMap: Record<string, number> = {};
  for (const msg of messages) {
    const key = msg.createdAt.toISOString().slice(0, 10);
    dailyMap[key] = (dailyMap[key] ?? 0) + 1;
  }
  const dailyData: MessageDay[] = Object.entries(dailyMap)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, count]) => ({ date, count }));

  // Rating distribution
  const ratingMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const msg of messages) {
    if (msg.feedbackRating != null && msg.feedbackRating >= 1 && msg.feedbackRating <= 5) {
      ratingMap[msg.feedbackRating] = (ratingMap[msg.feedbackRating] ?? 0) + 1;
    }
  }
  const ratingDist: RatingBucket[] = Object.entries(ratingMap).map(([rating, count]) => ({
    rating: Number(rating),
    count,
  }));

  // Conversation list — aggregate per clientId
  const convMap: Record<
    string,
    {
      messageCount: number;
      ratings: number[];
      hasEscalation: boolean;
      lastMessage: Date;
    }
  > = {};
  for (const msg of messages) {
    if (!convMap[msg.clientId]) {
      convMap[msg.clientId] = {
        messageCount: 0,
        ratings: [],
        hasEscalation: staffClientIds.has(msg.clientId),
        lastMessage: msg.createdAt,
      };
    }
    convMap[msg.clientId].messageCount += 1;
    if (msg.feedbackRating != null) {
      convMap[msg.clientId].ratings.push(msg.feedbackRating);
    }
    if (msg.createdAt > convMap[msg.clientId].lastMessage) {
      convMap[msg.clientId].lastMessage = msg.createdAt;
    }
  }

  // Resolve client names from DB
  const clientIds = Object.keys(convMap);
  const clients =
    clientIds.length > 0
      ? await prisma.client.findMany({
          where: { id: { in: clientIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
  const clientMap = Object.fromEntries(
    clients.map((c) => [c.id, `${c.firstName} ${c.lastName}`])
  );

  // If some messages reference clientIds not in the Client table, use clientId as name
  const conversations: ConversationRow[] = Object.entries(convMap)
    .sort(([, a], [, b]) => b.messageCount - a.messageCount)
    .slice(0, 20)
    .map(([clientId, data]) => ({
      clientId,
      clientName: clientMap[clientId] ?? clientId.slice(0, 8) + "…",
      messageCount: data.messageCount,
      avgRating:
        data.ratings.length > 0
          ? Math.round(
              (data.ratings.reduce((s, r) => s + r, 0) / data.ratings.length) * 10
            ) / 10
          : null,
      hasEscalation: data.hasEscalation,
      lastMessage: data.lastMessage,
    }));

  return {
    totalMessages,
    avgRating,
    escalationRate,
    activeClients,
    dailyData,
    ratingDist,
    conversations,
  };
}

type SearchParams = { days?: string };

export default async function ObservabilityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const { days: daysStr } = await searchParams;
  const rawDays = Math.min(parseInt(daysStr ?? "14", 10), 90);
  const period: Period = [7, 14, 30].includes(rawDays) ? (rawDays as Period) : 14;

  const stats = await fetchStats(session.tenantId, period);

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <ObservabilityClient stats={stats} period={period} />
      </div>
    </main>
  );
}