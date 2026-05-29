// Seed route — accessible via secret to populate KB for a tenant without full auth
// POST /api/test/seed-kb
// Body: { secret: "kestrel-test-seed-2026", tenantId?: string }
// If tenantId omitted, returns instructions. Pass secret + tenantId to execute.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SEED_SECRET = "kestrel-test-seed-2026";

// Credit repair Q&A seed data — realistic, white-label (no brand names)
const KB_SEED = [
  // === ONBOARDING ===
  {
    question: "How long does the onboarding take?",
    answer: "Most clients complete the onboarding wizard in about 5–10 minutes. You can save and come back anytime — your progress is saved.",
    category: "onboarding",
  },
  {
    question: "What happens after I submit my onboarding form?",
    answer: "Once you submit, you'll get access to your client portal immediately. Your credit report will be reviewed and we'll notify you when your dispute letters have been prepared and mailed.",
    category: "onboarding",
  },
  {
    question: "Do I need to upload my credit report right now?",
    answer: "Not immediately — you can upload it from the portal at any time. You'll see a prominent upload section when you're ready. We recommend uploading as soon as possible so we can start working on your disputes.",
    category: "onboarding",
  },
  {
    question: "Is my information secure?",
    answer: "Yes. Your data is encrypted and stored securely. We only use it to prepare and file your credit disputes. We never sell or share your personal information.",
    category: "onboarding",
  },

  // === DISPUTES ===
  {
    question: "How does the dispute process work?",
    answer: "Once you upload your credit report, we identify inaccurate, outdated, or unverifiable items. We then prepare and mail formal dispute letters to each credit bureau on your behalf. The bureaus are required by law to investigate and respond within 30 days.",
    category: "disputes",
  },
  {
    question: "How long does it take to see results?",
    answer: "Credit bureaus have up to 30 days to respond to dispute letters. Most clients start seeing updates within 30–45 days of their letters being mailed. We'll notify you in the portal when we receive a response.",
    category: "disputes",
  },
  {
    question: "Can you remove anything from my credit report?",
    answer: "We can only challenge items that are inaccurate, outdated, or unverifiable under the Fair Credit Reporting Act. We cannot remove accurate, legitimate information. Our team will identify every item that qualifies for dispute.",
    category: "disputes",
  },
  {
    question: "What is identity theft disclosure and why do I need to answer it?",
    answer: "If you've been a victim of identity theft, telling us allows us to file your disputes with additional legal weight. It also lets us add fraud alerts to your credit file, which requires bureaus to verify new account openings with you directly before granting credit.",
    category: "disputes",
  },
  {
    question: "Can I dispute items I already disputed before?",
    answer: "Yes. If you previously disputed an item and it wasn't removed, or if it's still appearing with incorrect information, we can dispute it again using different legal angles and documentation. Many items that aren't removed on the first attempt are removed on the second or third.",
    category: "disputes",
  },
  {
    question: "What happens after my disputes are mailed?",
    answer: "We monitor the bureaus for responses. If they verify the item, it must be removed. If they send a deletion notice, we'll update your portal and let you know. If they fail to respond within 30 days, that item can be escalated.",
    category: "disputes",
  },

  // === MAIL & TRACKING ===
  {
    question: "How will I know when my letters have been mailed?",
    answer: "You'll receive a notification in the portal as soon as your dispute letters are marked as mailed, along with the tracking number so you can follow the delivery yourself.",
    category: "mail",
  },
  {
    question: "What is certified mail and should I use it?",
    answer: "Certified mail provides proof of delivery and requires a signature from the receiving party. Many clients prefer it because it creates a paper trail that can be useful if a bureau later denies receiving a dispute. Your company has this option available for all mailings.",
    category: "mail",
  },
  {
    question: "Can I get a copy of the dispute letters that were sent?",
    answer: "Yes — your company can view and download a copy of all letters sent on your behalf from the documents section of the portal.",
    category: "mail",
  },

  // === SCORE & REPORTS ===
  {
    question: "Will my credit score go up after disputing?",
    answer: "Removing inaccurate, outdated, or unverifiable items is the primary way credit scores improve. The higher the proportion of negative items that are deleted, the more your score can increase. We can't guarantee a specific score change, but removing harmful items is the foundation of any score improvement strategy.",
    category: "scoring",
  },
  {
    question: "How often should I pull a new credit report?",
    answer: "We recommend pulling a new credit report every 30–45 days during active dispute cycles to check for updated statuses. Many bureaus allow free weekly reports. We'll notify you when we see changes and advise when it's time to pull a fresh report.",
    category: "scoring",
  },
  {
    question: "What's the difference between a credit report and a credit score?",
    answer: "Your credit report is the detailed record of all credit accounts, payment history, and inquiries. Your credit score is a number derived from that report — ranging from 300 to 850 — that summarizes your creditworthiness. We work with your full credit report to identify and dispute problematic items.",
    category: "scoring",
  },

  // === FUNDING ===
  {
    question: "How can I use my improved credit to get funding?",
    answer: "Once your score improves and negative items are removed, you become a stronger candidate for loans, credit cards, and other credit products. When we detect significant improvement in your report, we'll notify you that it's a good time to pursue funding options.",
    category: "funding",
  },
  {
    question: "Do you help with loan applications after my credit improves?",
    answer: "We focus on the credit repair side — improving your report and score. Once your credit has improved to a good standing, we'll let you know so you can pursue funding with the best possible profile. We don't take a cut of any loans you receive.",
    category: "funding",
  },

  // === PORTAL & ACCOUNT ===
  {
    question: "How do I log into the client portal?",
    answer: "You received a secure link when your account was created. Click that link to access your portal at any time. You don't need a separate password — the link is your access key.",
    category: "portal",
  },
  {
    question: "I forgot my portal link. How do I get back in?",
    answer: "Contact your credit professional directly — they can resend the portal link to your email. The link doesn't expire for 30 days, so check your inbox first.",
    category: "portal",
  },
  {
    question: "Is the chat feature monitored by a real person?",
    answer: "Our AI assistant handles most questions automatically and is available 24/7. If your question is outside what the AI can handle, it will be flagged for our team to follow up on. You'll always get a response.",
    category: "portal",
  },

  // === GENERAL ===
  {
    question: "What is FCRA and why does it matter for my credit?",
    answer: "The Fair Credit Reporting Act is a federal law that governs how credit bureaus handle your information. It gives you the right to dispute inaccurate information, requires bureaus to investigate and correct errors, and allows you to sue if they don't follow the law. Everything we do is grounded in FCRA rights and procedures.",
    category: "general",
  },
  {
    question: "Can I cancel my service at any time?",
    answer: "Yes — you can cancel at any time with no cancellation fees. Contact your credit professional directly to request cancellation and they will process it promptly.",
    category: "general",
  },
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { secret, tenantId } = body as { secret?: string; tenantId?: string };

    if (!secret || secret !== SEED_SECRET) {
      return NextResponse.json({ error: "Invalid or missing secret" }, { status: 401 });
    }

    if (!tenantId) {
      return NextResponse.json({
        error: "tenantId required",
        hint: "Pass { secret: 'kestrel-test-seed-2026', tenantId: '<your-tenant-id>' } to seed",
      }, { status: 400 });
    }

    // Clear existing entries for this tenant
    await prisma.knowledgeBaseEntry.deleteMany({ where: { tenantId } });

    // Insert seed data
    const created = await prisma.knowledgeBaseEntry.createMany({
      data: KB_SEED.map((entry) => ({
        tenantId,
        question: entry.question,
        answer: entry.answer,
        category: entry.category,
        isActive: true,
      })),
    });

    return NextResponse.json({
      ok: true,
      count: created.count,
      message: `${created.count} KB entries seeded for tenant ${tenantId}.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Seed failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    route: "POST /api/test/seed-kb",
    body: { secret: "kestrel-test-seed-2026", tenantId: "<your-tenant-id>" },
    entries: KB_SEED.length,
    categories: [...new Set(KB_SEED.map((e) => e.category))],
  });
}