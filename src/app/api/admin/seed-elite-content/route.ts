import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SCHEMA_SYNC_SECRET = process.env.SCHEMA_SYNC_SECRET ?? "dev-insecure-schema-sync-fallback";

const SEED_CONTENT = [
  {
    category: "email-sequences",
    title: "Cold Email Sequence — Week 1",
    description: "5-email cold outreach sequence for finding potential credit repair clients. Optimized for mortgage brokers, real estate agents, and financial advisors.",
    content: `<h2>Cold Email Sequence — Week 1</h2>
<p><strong>Day 1 — Initial Cold Email</strong></p>
<p>Subject: Quick question about your clients' credit</p>
<p>Hi [Name],</p>
<p>I work with [type of professional] who help clients with credit issues, and I wanted to reach out.</p>
<p>Do you have clients who are close to qualifying for a mortgage or loan but their credit is getting in the way?</p>
<p>If so, I'd love to share how we help their clients get dispute-ready faster — at no cost to you.</p>
<p>Worth a quick conversation?</p>
<p>Best,<br>[Your Name]</p>
<hr/>
<p><strong>Day 3 — Follow Up</strong></p>
<p>Subject: Re: Quick question about your clients' credit</p>
<p>Hi [Name],</p>
<p>Following up on my note — just wanted to make sure it didn't get buried.</p>
<p>If credit repair isn't something your clients ask about, no worries.</p>
<p>But if it comes up even occasionally, I'd love to be a resource.</p>
<p>Talk soon?</p>
<hr/>
<p><strong>Day 5 — Value Add</strong></p>
<p>Subject: This free guide might help your clients</p>
<p>Hi [Name],</p>
<p>I put together a free guide on how credit repair actually works — the real process, timelines, and what to expect.</p>
<p>If you have clients asking about credit, it might be worth sharing.</p>
<p>Happy to send it over.</p>
<p>— [Your Name]</p>`,
    tags: "cold-email,real-estate,mortgage,week-1",
  },
  {
    category: "email-sequences",
    title: "Warm Referral Follow-Up Sequence",
    description: "3-email sequence for following up with referrals from existing clients or partners.",
    content: `<h2>Warm Referral Follow-Up Sequence</h2>
<p><strong>Day 1 — Referral Introduction</strong></p>
<p>Subject: [Referrer Name] thought we should talk</p>
<p>Hi [Name],</p>
<p>[Referrer Name] suggested I reach out — they mentioned you might be looking for help with your credit.</p>
<p>I've been helping people in [city/industry] clean up their credit reports and I thought of you right away.</p>
<p>Would you be open to a quick 15-minute call this week?</p>
<hr/>
<p><strong>Day 4 — No Response Follow-Up</strong></p>
<p>Subject: Still happy to help</p>
<p>Hi [Name],</p>
<p>I wanted to check back in. I know how overwhelming credit issues can feel.</p>
<p>If you're ready to take a look at your options, I'm here.</p>
<p>No pressure — just wanted to stay on your radar.</p>
<hr/>
<p><strong>Day 7 — Social Proof</strong></p>
<p>Subject: [First Name], here's what we did for someone in a similar situation</p>
<p>Hi [Name],</p>
<p>I recently helped someone who was in a similar spot — had some collections and errors on their report that were keeping them from buying a home.</p>
<p>Within 60 days, they had 4 items removed and their score went up 47 points. They closed on their house 3 months later.</p>
<p>Not a guarantee — but worth exploring what's possible.</p>
<p>Let me know if you'd like to talk.</p>`,
    tags: "referral,follow-up, warm",
  },
  {
    category: "social-swipe",
    title: "Instagram Post — Before/After Hook",
    description: "High-engagement Instagram post format. Uses the before/after transformation hook.",
    content: `<h2>Instagram Post — Before/After Hook</h2>
<p><strong>Carousel Slide 1 (Hook)</strong></p>
<p>POV: You just checked your credit report 💀</p>
<p><strong>Slide 2</strong></p>
<p>Here's what's probably on it:</p>
<p>• Collections you didn't know about<br/>• Old late payments<br/>• Errors from identity theft</p>
<p><strong>Slide 3</strong></p>
<p>The bureaus don't volunteer this information.</p>
<p>You have to dispute it yourself — in writing — to get it removed.</p>
<p><strong>Slide 4</strong></p>
<p>Most people give up.</p>
<p>That's exactly why the credit repair industry charges $100-300/month to do it for you.</p>
<p><strong>Slide 5</strong></p>
<p>We built a tool that does it for $9.99/month.</p>
<p>Upload your report → Get your letters → Mail them yourself</p>
<p><strong>Slide 6 (CTA)</strong></p>
<p>Link in bio to get started — takes 10 minutes.</p>
<p>#CreditRepair #CreditScore #FinancialFreedom</p>`,
    tags: "instagram,carousel,before-after,social",
  },
  {
    category: "social-swipe",
    title: "Facebook Post — Testimonial Style",
    description: "Facebook post format using a client testimonial story to build trust.",
    content: `<h2>Facebook Post — Testimonial Style</h2>
<p><strong>Post</strong></p>
<p>Last month I got a message from someone I'll call James.</p>
<pHe'd been trying to buy a home for two years.</p>
<p>His credit score was 582. His mortgage broker told him to come back at 640.</p>
<p>He didn't know why his score was so low — he thought he was just "bad with money."</p>
<p>Turns out there were 3 collection accounts on his report that weren't even his.</p>
<p>We helped him dispute them. All 3 came off within 45 days.</p>
<p>His score hit 641 last week.</p>
<p>He closes on his house next month. 🎉</p>
<p>------</p>
<p>If you've checked your credit report and something looked wrong — it probably is.</p>
<p>Drop a comment below and I'll personally point you to the right resources.</p>
<p>(No pitch. Seriously.)</p>
<p>#CreditRepair #Mortgage #HomeBuying</p>`,
    tags: "facebook,testimonial,story",
  },
  {
    category: "ad-copy",
    title: "Facebook Ad — Problem-Aware Audience",
    description: "Facebook ad for people who already know they have credit issues. Direct response copy.",
    content: `<h2>Facebook Ad — Problem-Aware</h2>
<p><strong>Headline:</strong> Stop Paying Credit Repair Companies $200/Month</p>
<p><strong>Body:</strong></p>
<p>You're not broke. You're just one error away from a better score.</p>
<p>Collections. Late payments. Old charge-offs.</p>
<p>75% of credit reports have at least one error — and you have the right to dispute them under federal law.</p>
<p>Most people either don't know this... or don't want to deal with the paperwork.</p>
<p>We built a tool that generates every dispute letter you need, ready to print and mail — for $9.99/month.</p>
<p>No more paying $200/month for a company to mail the same letters.</p>
<p><strong>CTA:</strong> Start Free Trial →</p>
<p><strong>Social Proof:</strong> Join 12,400+ members who dispute their own credit.</p>
<p><strong>CTA Button:</strong> Start Your Free Trial</p>`,
    tags: "facebook,ad,problem-aware,direct-response",
  },
  {
    category: "ad-copy",
    title: "Google Ad — Intent-Based",
    description: "Google Search ad for people actively searching for credit repair options.",
    content: `<h2>Google Search Ad</h2>
<p><strong>Headline 1:</strong> Credit Repair Letter Generator<br/><strong>Headline 2:</strong> Download & Mail in Minutes<br/><strong>Headline 3:</strong> Plans From $9.99/Month</p>
<p><strong>Description:</strong></p>
<p>Generate dispute letters for Equifax, Experian & TransUnion in minutes — not weeks.</p>
<p>Our AI builds each letter tailored to your specific items. Download, print, mail.</p>
<p>No middlemen. No monthly minimums.</p>
<p>Cancel anytime.</p>
<p><strong>Display URL:</strong> creditwizard.ai/dispute</p>
<p><strong>CTA:</strong> Start Now — Free 7-Day Trial</p>`,
    tags: "google,search,ad,intent",
  },
  {
    category: "lead-magnets",
    title: "Free Credit Report Template — DFY Analysis",
    description: "Lead magnet that walks users through analyzing their credit report and identifying dispute targets.",
    content: `<h2>Lead Magnet: Credit Report Analysis Template</h2>
<p><strong>Type:</strong> PDF Worksheet</p>
<p><strong>Title:</strong> "Your Credit Report Scorecard — Find Every Disputeable Item in 15 Minutes"</p>
<p><strong>What it contains:</strong></p>
<ol>
<li>Step-by-step guide to reading your 3-bureau credit report</li>
<li>Red flag checklist (collections, charge-offs, late payments, fraud flags)</li>
<li>Dispute priority matrix — which items to challenge first</li>
<li>Sample letter templates for each category</li>
<li>Timeline worksheet — what to expect over 90 days</li>
</ol>
<p><strong>Funnel placement:</strong></p>
<ul>
<li>Website opt-in (lead magnet page)</li>
<li>Facebook/Instagram bio link</li>
<li>Cold email follow-up attachment</li>
<li>Retargeting audience capture</li>
</ul>
<p><strong>Delivery:</strong> Instant download after email capture</p>
<p><strong>Follow-up email sequence:</strong> 3-email sequence delivering the template + upgrade offer</p>`,
    tags: "lead-magnet,pdf,analysis,worksheet",
  },
  {
    category: "compliance-kit",
    title: "Client Agreement Template",
    description: "Standard credit repair service agreement for clients. Covers scope, limitations, and legal disclosures.",
    content: `<h2>Client Service Agreement — Credit Repair</h2>
<p><strong>Section 1 — Parties</strong></p>
<p>This Agreement is entered into between [Company Name] ("Service Provider") and [Client Name] ("Client"), effective [Date].</p>
<p><strong>Section 2 — Scope of Services</strong></p>
<p>Service Provider agrees to provide the following services:</p>
<ul>
<li>Generation of written dispute letters based on information provided by Client</li>
<li>Review of credit report items identified by Client</li>
<li>Guidance on dispute process and timeline</li>
</ul>
<p><strong>Section 3 — Client Responsibilities</strong></p>
<ul>
<li>Client agrees to provide accurate and complete information</li>
<li>Client is responsible for mailing dispute letters directly to credit bureaus</li>
<li>Client will track and report dispute outcomes</li>
</ul>
<p><strong>Section 4 — Limitations</strong></p>
<p>Service Provider does not guarantee specific outcomes. Credit bureaus are required by law to investigate disputes within 30 days. Results vary based on individual credit history and bureau response.</p>
<p><strong>Section 5 — Fees</strong></p>
<p>[Plan Name] — $[price]/month. Cancel anytime. No long-term contract.</p>
<p><strong>Section 6 — Privacy</strong></p>
<p>Client information is protected per our Privacy Policy. We do not sell or share personal data with third parties.</p>`,
    tags: "compliance,agreement,legal,template",
  },
  {
    category: "referral-templates",
    title: "Referral Program Launch Email",
    description: "Email to send to existing clients announcing the referral program. Includes referral link and incentives.",
    content: `<h2>Referral Program Launch Email</h2>
<p><strong>Subject:</strong> You just made credit repair look easy — here's how to share it</p>
<p>Hi [First Name],</p>
<p>You've been working hard on your credit — and it's paying off. We've loved being part of that with you.</p>
<p>Now here's something you might not know: you can refer friends and earn rewards while you're at it.</p>
<p><strong>How it works:</strong></p>
<ul>
<li>Share your referral link: [REFERRAL LINK]</li>
<li>Your friend signs up for Pro or Elite</li>
<li>You earn 20-30% of their monthly fee — forever</li>
</ul>
<p>That's not a one-time payout — you get paid as long as they stay a customer.</p>
<p>For Elite referrals, that's up to $38.99/month for as long as your referral stays active.</p>
<p><strong>Your referral link:</strong><br/>[BIG CTA BUTTON — Copy My Link]</p>
<p>No spam. No awkward sales pitch. Just share the link with people you trust.</p>
<p>Thank you for being part of the community.</p>
<p>— The [Company Name] Team</p>`,
    tags: "referral,email,launch,incentive",
  },
  {
    category: "ad-copy",
    title: "TikTok Ad — Organic Style",
    description: "Short-form TikTok ad that looks like authentic organic content. Direct-to-camera style.",
    content: `<h2>TikTok Ad — Organic Style</h2>
<p><strong>Format:</strong> 15-30 sec vertical video, direct-to-camera</p>
<p><strong>Opening (0-3s):</strong></p>
<p>"POV: You just found out you're paying $200/month for credit repair and doing all the work yourself 💀"</p>
<p><strong>Body (3-15s):</strong></p>
<p>"So here's what actually happens at those companies..."</p>
<p>[Cut to screen recording of the platform]</p>
<p>"They use the same software as you. Generate the same letters. And mail the same stuff."</p>
<p>"The only difference? They're charging $200/month for it."</p>
<p>"We built this — for $9.99/month."</p>
<p>[Show upload → generate → download flow]</p>
<p>"It literally takes 10 minutes to dispute everything on your report."</p>
<p><strong>CTA (15-30s):</strong></p>
<p>"Link in bio. Try it free for 7 days."</p>
<p>"And if you don't like it — cancel in 30 seconds. No questions asked."</p>
<p>#CreditRepair #Finance #FYP #MoneyTips</p>`,
    tags: "tiktok,video,ad,organic-style",
  },
];

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-sync-secret");
  if (secret !== SCHEMA_SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  for (const item of SEED_CONTENT) {
    try {
      const created = await prisma.eliteContent.create({ data: { ...item } });
      results.push(`Created: ${item.title}`);
    } catch (err: any) {
      if (err?.code === "P2002") {
        results.push(`Already exists: ${item.title}`);
      } else {
        results.push(`Error: ${item.title} — ${err?.message}`);
      }
    }
  }

  return NextResponse.json({ ok: true, count: results.length, results });
}
