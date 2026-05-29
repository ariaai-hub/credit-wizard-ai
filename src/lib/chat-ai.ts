import { prisma } from "@/lib/prisma";
import { web_search } from "@/lib/web-search";

const SYSTEM_PROMPT = `You are a friendly, knowledgeable customer service specialist for a credit repair company. You sound like a warm, welcoming host showing someone around their home — conversational, genuine, and helpful. Never robotic. Plain English only. No corporate jargon.

You have full access to the client\'s specific credit repair case details. Answer from that data first. If you know something specific from their file, lead with that.

If you do not know something specific to their case, be honest and say so — and offer to forward the question to their support team.

Key things you know about their case:
- What stage their case is in and when it changed
- What documents they have uploaded
- When their disputes were created
- When letters were mailed and the tracking number if available
- How many negative items are being disputed and their status
- The full timeline of their case

When giving updates:
- Be specific with dates wherever you have them
- If letters have been mailed, say so and note the 30-45 day bureau response window
- If they are waiting on results, explain what that window means in practice
- If something is overdue beyond normal timelines, mention it

Never say: "As an AI..." / "I do not have access to..." / "Based on my training data..."
Never sound hesitant. Be confident and direct, but warm.

When you genuinely cannot answer from the client data or general credit knowledge, say something like:
"I am going to send this over to the team and they will follow up with you directly — usually within an hour or so."

Keep responses conversational: 2-4 sentences for simple questions, up to a short paragraph for complex ones.`;

export type ClientContext = {
  clientId: string;
  tenantId: string;
  clientName: string;
  lifecycleStage: string;
  stageChangedAt: string | null;
  mailSentAt: string | null;
  trackingNumber: string | null;
  onboardingCompletedAt: string | null;
  documentsUploaded: string[];
  negativeItemsCount: number;
  disputeStatus: string;
  timeline: { date: string; event: string }[];
};

export async function buildClientContext(clientId: string, tenantId: string): Promise<ClientContext> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      firstName: true,
      lastName: true,
      lifecycleStage: true,
      updatedAt: true,
      mailSentAt: true,
      trackingNumber: true,
      onboardingCompletedAt: true,
      createdAt: true,
    },
  });

  if (!client) throw new Error("Client not found");

  const documentActivity = await prisma.auditLog.findMany({
    where: { tenantId, referenceType: "client", referenceId: clientId, eventType: { in: ["CLIENT_PORTAL_DOCUMENT_SUBMITTED"] } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const disputeCases = await prisma.disputeCaseRecord.findMany({
    where: { clientId },
    include: {
      tradelines: {
        select: { status: true, bureau: true, createdAt: true },
      },
    },
  });

  const tradelines = disputeCases.flatMap((dc) => dc.tradelines);
  const negativeCount = tradelines.filter(
    (t) => !["GOOD", "REMOVED", "RESOLVED"].includes(t.status)
  ).length;

  const timeline: { date: string; event: string }[] = [];
  timeline.push({ date: client.createdAt.toISOString(), event: "Account created" });
  if (client.onboardingCompletedAt) {
    timeline.push({ date: client.onboardingCompletedAt.toISOString(), event: "Onboarding completed" });
  }
  if (tradelines.length > 0) {
    const earliest = tradelines.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
    timeline.push({
      date: earliest.createdAt.toISOString(),
      event: `${negativeCount} negative item(s) added to dispute`,
    });
  }
  if (client.mailSentAt) {
    const trackingSuffix = client.trackingNumber ? ` (Tracking: ${client.trackingNumber})` : "";
    timeline.push({ date: client.mailSentAt.toISOString(), event: `Dispute letters mailed${trackingSuffix}` });
  }

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return {
    clientId,
    tenantId,
    clientName: `${client.firstName} ${client.lastName}`.trim(),
    lifecycleStage: client.lifecycleStage,
    stageChangedAt: client.updatedAt.toISOString(),
    mailSentAt: client.mailSentAt?.toISOString() ?? null,
    trackingNumber: client.trackingNumber ?? null,
    onboardingCompletedAt: client.onboardingCompletedAt?.toISOString() ?? null,
    documentsUploaded: documentActivity.map((d) => fmtDate(d.createdAt)),
    negativeItemsCount: negativeCount,
    disputeStatus: tradelines.length > 0 ? "Active" : "No disputes filed yet",
    timeline,
  };
}

export async function getKnowledgeBaseEntries(tenantId: string, query: string): Promise<string[]> {
  const entries = await prisma.knowledgeBaseEntry.findMany({
    where: { tenantId, isActive: true },
    select: { question: true, answer: true, category: true },
  });

  const ql = query.toLowerCase();
  return entries
    .filter(
      (e) =>
        e.question.toLowerCase().includes(ql) ||
        ql.includes(e.question.toLowerCase())
    )
    .slice(0, 5)
    .map((e) => `[${e.category.toUpperCase()}] Q: ${e.question}\nA: ${e.answer}`);
}

function stageQuickReply(stage: string, msg: string): string | null {
  const m = msg.toLowerCase();
  if (stage === "MAIL_QUEUED" && (m.includes("when") || m.includes("ship") || m.includes("mail") || m.includes("sent") || m.includes("track"))) {
    return "Your dispute letters are ready to go and are actually in the queue right now being processed for mailing. Should not be much longer at all — you will see the tracking number show up here the moment they have been shipped out.";
  }
  if (stage === "MAIL_SENT" && (m.includes("how long") || m.includes("waiting") || m.includes("results") || m.includes("update") || m.includes("bureau"))) {
    return "Your letters went out and the bureaus typically need 30 to 45 days from the date they received them to come back with a response. We are right in that window, so nothing to worry about yet. When results start coming in, you will be the first to know around here.";
  }
  return null;
}

function buildPrompt(context: ClientContext, chatHistory: string, newMessage: string): string {
  const timelineSection =
    context.timeline.length > 0
      ? context.timeline
          .map((t) => `  - ${new Date(t.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}: ${t.event}`)
          .join("\n")
      : "  No events yet";

  const stageLabel: Record<string, string> = {
    INTAKE_RECEIVED: "New intake — onboarding incomplete",
    ONBOARDING_COMPLETE: "Onboarding complete",
    READY_FOR_DISPUTE: "Ready for dispute",
    DISPUTES_IN_PROGRESS: "Disputes in progress",
    MAIL_QUEUED: "Dispute letters queued to be mailed",
    MAIL_SENT: "Dispute letters mailed",
    COMPLETED: "Case completed",
  };

  return `${SYSTEM_PROMPT}

CLIENT PROFILE:
Name: ${context.clientName}
Case stage: ${stageLabel[context.lifecycleStage] ?? context.lifecycleStage}
Stage last changed: ${context.stageChangedAt ? new Date(context.stageChangedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Unknown"}
Documents uploaded: ${context.documentsUploaded.length > 0 ? context.documentsUploaded.join(", ") : "None yet"}
Negative items in dispute: ${context.negativeItemsCount}
Dispute status: ${context.disputeStatus}
Timeline:
${timelineSection}
${context.mailSentAt
    ? `Letters mailed: ${new Date(context.mailSentAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} — bureaus typically respond in 30-45 days from that date.`
    : "Letters have not been mailed yet."}
${context.trackingNumber ? "Certified tracking number: " + context.trackingNumber : ""}

CONVERSATION HISTORY:
${chatHistory || "(New conversation — this is their first message)"}

NEW MESSAGE FROM CLIENT:
"${newMessage}"

Your response (warm, conversational, plain English):`;
}

export async function generateAIResponse(
  clientId: string,
  tenantId: string,
  messageId: string,
): Promise<{ response: string; escalated: boolean }> {
  const context = await buildClientContext(clientId, tenantId);

  const recentMessages = await prisma.chatMessage.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { role: true, content: true },
  });

  const history = [...recentMessages].reverse();
  const chatHistory = history.map((m) => `${m.role === "CLIENT" ? "Client" : "Support"}: "${m.content}"`).join("\n");

  const pending = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!pending) throw new Error("Message not found");
  const newMessage = pending.content;

  // Detect if client claims they finished onboarding
  const completionPatterns = [
    /i\s*(already\s*)?did\s*it/i,
    /i\s*finished/i,
    /i\s*completed?\s*(it|the|my)?/i,
    /it\'?s?\s*(all\s*)?done/i,
    /done\s*(with\s*)?(it|my|the)?/i,
    /i\s*submite?d?\s*(everyth|all)\s*(thing|documents?)/i,
    /uploaded?\s*(everyth|all)\s*(thing|documents?)/i,
  ];
  const claimsCompletion = completionPatterns.some((p) => p.test(newMessage));

  // If they claim to have finished onboarding, check what's actually missing
  if (claimsCompletion) {
    const clientData = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        onboardingCompletedAt: true,
        creditReportUrl: true,
        creditReportImports: { select: { id: true } },
        disputeCases: { select: { id: true } },
        lifecycleStage: true,
      },
    });

    if (clientData?.onboardingCompletedAt) {
      return {
        response: "It looks like your onboarding is already marked as complete — you're all set on our end! If something feels off or missing, just reply and we'll take a look right away.",
        escalated: false,
      };
    }

    const hasCreditReport = !!(clientData?.creditReportUrl || (clientData?.creditReportImports?.length ?? 0) > 0);
    const missing: string[] = [];
    if (!hasCreditReport) missing.push("credit report upload");
    if (!clientData?.disputeCases || clientData.disputeCases.length === 0) missing.push("dispute cases created");

    if (missing.length === 0) {
      return {
        response: "Looking at your file, everything appears to be in order! If something feels off, just let us know and we'll take a look.",
        escalated: false,
      };
    }

    const missingList = missing.map((m) => `— ${m}`).join("\n");
    return {
      response: `Thanks for letting us know! I just checked your file and we actually still need a couple things to wrap up your onboarding:\n\n${missingList}\n\nCan you get those uploaded when you have a chance? Reply here if you run into any trouble — we're happy to walk you through it.`,
      escalated: false,
    };
  }

  const quick = stageQuickReply(context.lifecycleStage, newMessage);
  if (quick) {
    return { response: quick, escalated: false };
  }

  const kbEntries = await getKnowledgeBaseEntries(tenantId, newMessage);

  let webContext = "";
  try {
    const webResults = await web_search({ query: newMessage + " credit repair", count: 3 });
    if (webResults?.results?.length) {
      webContext =
        "\n\nWEB SEARCH RESULTS (use if relevant):\n" +
        webResults.results
          .slice(0, 2)
          .map((r) => `- ${r.title}: ${r.snippet}`)
          .join("\n");
    }
  } catch { /* ignore */ }

  const prompt =
    buildPrompt(context, chatHistory, newMessage) +
    (kbEntries.length > 0 ? `\n\nRELEVANT KNOWLEDGE BASE:\n${kbEntries.join("\n\n")}` : "") +
    webContext;

  const apiKey = process.env.MINIMAX_API_KEY || process.env.OPENAI_API_KEY || "";
  const model = process.env.MINIMAX_MODEL || "MiniMax-Text-01";

  let aiResponse = "";
  try {
    const response = await fetch("https://api.minimax.chat/v1/text/chatcompletion_v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: newMessage },
        ],
        max_tokens: 500,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    aiResponse = data.choices?.[0]?.message?.content?.trim() || "";
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { status: "FAILED", errorMessage: errMsg },
    });
    return {
      response:
        "I am running into a little trouble pulling that together right now — but I have sent your question to the team and they will follow up with you within the hour. Thanks for your patience!",
      escalated: true,
    };
  }

  const escalationPhrases = [
    "i'm not sure about",
    "i don't have access to",
    "you'd need to ask",
    "contact us directly",
    "forward this",
    "let me send this to",
  ];
  const escalated = escalationPhrases.some((p) => aiResponse.toLowerCase().includes(p));

  return { response: aiResponse, escalated };
}
