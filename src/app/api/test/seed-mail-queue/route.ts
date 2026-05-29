import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SAMPLE_CLIENTS = [
  {
    firstName: "Stephanie",
    lastName: "Mills",
    email: "stephanie.mills@example.com",
    phone: "+1 (305) 555-0142",
    address: "20549 SW 1st St",
    city: "Pembroke Pines",
    state: "FL",
    zip: "33029",
    dob: "1971-07-26",
    ssnLast4: "6761",
    tradelines: [
      { creditor: "NAVY FEDERAL CR UNION", type: "Credit Card", balance: 0, status: "CLOSED", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
      { creditor: "TOWPATH CREDIT UNION", type: "Credit Card", balance: 681, status: "CLOSED", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
      { creditor: "CREDIT ONE BANK NA", type: "Credit Card", balance: 454, status: "CLOSED", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
      { creditor: "KIA FINANCE AMERICA", type: "Auto Loan", balance: 37765, status: "PAST_DUE", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
      { creditor: "LVNV FUNDING LLC", type: "Collection", balance: 3773, status: "CLOSED", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
    ],
  },
  {
    firstName: "James",
    lastName: "Carter",
    email: "james.carter@example.com",
    phone: "+1 (212) 555-0198",
    address: "145 W 72nd St Apt 3B",
    city: "New York",
    state: "NY",
    zip: "10023",
    dob: "1985-03-15",
    ssnLast4: "4432",
    tradelines: [
      { creditor: "CHASE CARD SERVICES", type: "Credit Card", balance: 2200, status: "CLOSED", bureaus: ["TRANSUNION"] },
      { creditor: "CAPITAL ONE", type: "Credit Card", balance: 890, status: "CLOSED", bureaus: ["EXPERIAN"] },
      { creditor: "MERRICK BANK", type: "Credit Card", balance: 1200, status: "PAST_DUE", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
      { creditor: "JEFFERSON CAPITAL SYSTEMS", type: "Collection", balance: 1897, status: "COLLECTION", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
    ],
  },
  {
    firstName: "Tamika",
    lastName: "Davis",
    email: "tamika.davis@example.com",
    phone: "+1 (404) 555-0234",
    address: "883 Peachtree St NE",
    city: "Atlanta",
    state: "GA",
    zip: "30309",
    dob: "1979-11-02",
    ssnLast4: "9021",
    tradelines: [
      { creditor: "SYNCB / TJX DC", type: "Credit Card", balance: 3400, status: "CLOSED", bureaus: ["TRANSUNION"] },
      { creditor: "COMENITYCAPITAL / HARDRK", type: "Credit Card", balance: 670, status: "CLOSED", bureaus: ["EQUIFAX"] },
      { creditor: "MRV / VERV-REV", type: "Collection", balance: 2100, status: "COLLECTION", bureaus: ["EXPERIAN", "TRANSUNION"] },
      { creditor: "PROGRESSIVE LEASING", type: "Other", balance: 1800, status: "PAST_DUE", bureaus: ["EQUIFAX", "EXPERIAN"] },
    ],
  },
  {
    firstName: "Marcus",
    lastName: "Williams",
    email: "marcus.williams@example.com",
    phone: "+1 (312) 555-0876",
    address: "4422 S Lake Shore Ave",
    city: "Chicago",
    state: "IL",
    zip: "60653",
    dob: "1982-06-19",
    ssnLast4: "3344",
    tradelines: [
      { creditor: "AMERICREDIT / GM FINANCIAL", type: "Auto Loan", balance: 12400, status: "CLOSED", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
      { creditor: "WELLS FARGO", type: "Credit Card", balance: 5500, status: "CLOSED", bureaus: ["EQUIFAX"] },
      { creditor: "PORTFOLIO RECOVERY", type: "Collection", balance: 4300, status: "COLLECTION", bureaus: ["EXPERIAN", "TRANSUNION"] },
    ],
  },
  {
    firstName: "Keisha",
    lastName: "Thompson",
    email: "keisha.thompson@example.com",
    phone: "+1 (713) 555-0342",
    address: "7704 Fondren Rd",
    city: "Houston",
    state: "TX",
    zip: "77074",
    dob: "1976-01-28",
    ssnLast4: "7789",
    tradelines: [
      { creditor: "FIRST PREMIER BANK", type: "Credit Card", balance: 890, status: "CLOSED", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
      { creditor: "WEBBANK / FINGERHUT", type: "Credit Card", balance: 0, status: "CLOSED", bureaus: ["TRANSUNION"] },
      { creditor: "DEPT OF EDUCATION / NELN", type: "Student Loan", balance: 11319, status: "PAST_DUE", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
      { creditor: "SUNRISECREDITORS", type: "Collection", balance: 3100, status: "COLLECTION", bureaus: ["EQUIFAX"] },
    ],
  },
  {
    firstName: "Robert",
    lastName: "Johnson",
    email: "robert.johnson@example.com",
    phone: "+1 (602) 555-0455",
    address: "2801 E Camelback Rd",
    city: "Phoenix",
    state: "AZ",
    zip: "85016",
    dob: "1988-09-07",
    ssnLast4: "5567",
    tradelines: [
      { creditor: "MIDLAND CREDIT MANAGEMENT", type: "Collection", balance: 2800, status: "COLLECTION", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
      { creditor: "CAPITAL ONE", type: "Credit Card", balance: 1100, status: "CLOSED", bureaus: ["EXPERIAN"] },
      { creditor: "CARDWORKS/CITIBANK", type: "Credit Card", balance: 7800, status: "PAST_DUE", bureaus: ["EQUIFAX", "TRANSUNION"] },
    ],
  },
  {
    firstName: "Latasha",
    lastName: "Brown",
    email: "latasha.brown@example.com",
    phone: "+1 (213) 555-0678",
    address: "1350 Sunset Blvd",
    city: "Los Angeles",
    state: "CA",
    zip: "90026",
    dob: "1983-04-14",
    ssnLast4: "2211",
    tradelines: [
      { creditor: "BANK OF AMERICA", type: "Credit Card", balance: 4300, status: "CLOSED", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
      { creditor: "HOME DEPOT / SYNCB", type: "Credit Card", balance: 2100, status: "CLOSED", bureaus: ["TRANSUNION"] },
      { creditor: "AT&T / UNIVERSAL CARD", type: "Collection", balance: 450, status: "COLLECTION", bureaus: ["EQUIFAX"] },
      { creditor: "AURORA FINANCIAL", type: "Collection", balance: 5600, status: "COLLECTION", bureaus: ["EXPERIAN", "TRANSUNION"] },
    ],
  },
  {
    firstName: "Derek",
    lastName: "Jackson",
    email: "derek.jackson@example.com",
    phone: "+1 (469) 555-0899",
    address: "4421 Ross Ave",
    city: "Dallas",
    state: "TX",
    zip: "75201",
    dob: "1990-12-03",
    ssnLast4: "8890",
    tradelines: [
      { creditor: "GECRB / AMAZON", type: "Credit Card", balance: 1900, status: "CLOSED", bureaus: ["EQUIFAX", "TRANSUNION"] },
      { creditor: "SYNCHRONY / LOWE'S", type: "Credit Card", balance: 3200, status: "PAST_DUE", bureaus: ["EXPERIAN"] },
      { creditor: "NAVY FEDERAL CREDIT UNION", type: "Credit Card", balance: 5100, status: "CLOSED", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
      { creditor: "CREDENCE RESOURCE", type: "Collection", balance: 1900, status: "COLLECTION", bureaus: ["TRANSUNION"] },
    ],
  },
  {
    firstName: "Shanice",
    lastName: "Garcia",
    email: "shanice.garcia@example.com",
    phone: "+1 (305) 555-0211",
    address: "8901 Fontainebleau Blvd",
    city: "Miami",
    state: "FL",
    zip: "33172",
    dob: "1977-08-22",
    ssnLast4: "3345",
    tradelines: [
      { creditor: "WELLS FARGO DEALERS", type: "Auto Loan", balance: 8900, status: "CLOSED", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
      { creditor: "DISCOVER BANK", type: "Credit Card", balance: 6700, status: "CLOSED", bureaus: ["EXPERIAN"] },
      { creditor: "ASHLEY EQUIPMENT", type: "Collection", balance: 2200, status: "COLLECTION", bureaus: ["EQUIFAX", "TRANSUNION"] },
      { creditor: "US DEPT OF ED / GLELSI", type: "Student Loan", balance: 0, status: "CLOSED", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
    ],
  },
  {
    firstName: "Anthony",
    lastName: "Harris",
    email: "anthony.harris@example.com",
    phone: "+1 (202) 555-0123",
    address: "1200 U St NW",
    city: "Washington",
    state: "DC",
    zip: "20009",
    dob: "1984-05-11",
    ssnLast4: "6678",
    tradelines: [
      { creditor: "CITIBANK NA", type: "Credit Card", balance: 4300, status: "CLOSED", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
      { creditor: "BARCLAYS BANK DELAWARE", type: "Credit Card", balance: 1800, status: "PAST_DUE", bureaus: ["EXPERIAN"] },
      { creditor: "KIA MOTORS FINANCE", type: "Auto Loan", balance: 22100, status: "PAST_DUE", bureaus: ["EQUIFAX", "TRANSUNION"] },
      { creditor: "ENHANCED RECOVERY", type: "Collection", balance: 3100, status: "COLLECTION", bureaus: ["EQUIFAX", "EXPERIAN", "TRANSUNION"] },
    ],
  },
];

function generateDisputeLetter(
  firstName: string,
  lastName: string,
  address: string,
  city: string,
  state: string,
  zip: string,
  dob: string,
  ssnLast4: string,
  creditor: string,
  bureau: string,
  accountType: string,
  balance: number,
  bureauName: string,
  bureauStreet: string,
  bureauCity: string,
  bureauState: string,
  bureauZip: string
): string {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return `CREDIT DISPUTE — FCRA INVESTIGATION REQUEST
${"=".repeat(60)}

${today}

${bureauName}
${bureauStreet}
${bureauCity}, ${bureauState}  ${bureauZip}

RE: Dispute of Inaccurate Account Information
Consumer: ${firstName} ${lastName}
Date of Birth: ${dob}
Address: ${address}, ${city}, ${state} ${zip}
SSN: XXX-XX-${ssnLast4}

To Whom It May Concern:

I am writing to formally dispute inaccurate information appearing on my credit report as reported to ${bureauName}.

I hereby request that ${bureauName} conduct a reasonable reinvestigation into the following account, as permitted by Section 611 of the Fair Credit Reporting Act (15 U.S.C. § 1681i).

ACCOUNT INFORMATION IN DISPUTE:
-------------------------------
Creditor:          ${creditor}
Account Type:      ${accountType}
Balance:           ${balance > 0 ? `$${balance.toLocaleString()}` : "$0.00"}
Bureau:            ${bureauName}

BASIS FOR DISPUTE:
-------------------
The above-referenced account information is inaccurate and/or unverifiable. I have reason to believe this information cannot be verified as accurate and complete in accordance with the requirements of the Fair Credit Reporting Act.

Specifically, I request that ${bureauName}:

1. Contact the furnisher of this account information and verify that the data reported is accurate and complete in all respects.

2. If the furnisher cannot verify the information as accurate and complete, promptly delete this account from my credit report.

3. Provide me with written confirmation of the results of any reinvestigation conducted pursuant to 15 U.S.C. § 1681i.

If you determine that the information is inaccurate, you must promptly correct the information in my credit file and notify all other consumer reporting agencies to which you have provided the inaccurate information so that they may update their records accordingly.

This is a formal request made under my rights under the Fair Credit Reporting Act. I reserve all rights and remedies available to me under federal and state law.

Please direct all correspondence to:

${firstName} ${lastName}
${address}
${city}, ${state}  ${zip}

Thank you for your prompt attention to this matter.

Sincerely,

${firstName} ${lastName}
${address}
${city}, ${state}  ${zip}

---
FCRA Rights Notice: You have the right to dispute inaccurate or incomplete information in your credit report. The credit bureau must investigate your dispute and respond within 30 days of receiving your dispute. 15 U.S.C. §§ 1681i, 1681j.
`;
}

const BUREAUS: Record<string, { name: string; street: string; city: string; state: string; zip: string }> = {
  EQUIFAX: { name: "Equifax Information Services LLC", street: "PO Box 105496", city: "Atlanta", state: "GA", zip: "30348-5496" },
  EXPERIAN: { name: "Experian", street: "PO Box 4500", city: "Allen", state: "TX", zip: "75013" },
  TRANSUNION: { name: "TransUnion LLC", street: "PO Box 2000", city: "Chester", state: "PA", zip: "19022" },
};

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-seed-secret");
  if (secret !== "kestrel-test-seed-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get or create the test tenant
    let tenant = await prisma.tenant.findUnique({ where: { slug: "octar1" } });
    if (!tenant) {
      return NextResponse.json({ error: "Test tenant 'octar1' not found. Run /api/test/create-login first." }, { status: 400 });
    }

    // Wipe existing test clients for this tenant
    const existingClients = await prisma.client.findMany({
      where: { tenantId: tenant.id },
      select: { id: true },
    });
    const existingIds = existingClients.map(c => c.id);
    if (existingIds.length > 0) {
      await prisma.disputeTradelineRecord.deleteMany({
        where: { disputeCase: { clientId: { in: existingIds } } },
      });
      await prisma.disputeCaseRecord.deleteMany({
        where: { clientId: { in: existingIds } },
      });
      await prisma.client.deleteMany({
        where: { id: { in: existingIds } },
      });
    }

    // Ensure mailing token account
    await prisma.mailTokenAccount.upsert({
      where: { tenantId: tenant.id },
      update: { purchasedBalance: 100, usedBalance: 0 },
      create: { tenantId: tenant.id, purchasedBalance: 100, usedBalance: 0 },
    });

    let totalTradelines = 0;

    for (const clientData of SAMPLE_CLIENTS) {
      // Create client
      const client = await prisma.client.create({
        data: {
          tenantId: tenant.id,
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          city: clientData.city,
          clientState: clientData.state,
          zip: clientData.zip,
          dateOfBirth: clientData.dob,
          ssnLast4: clientData.ssnLast4,
          reportedIdentityTheft: false,
          authorizedFtcIdentityTheftReport: true,
          authorizedCfpbComplaint: true,
          authorizedBbbComplaint: true,
          disputedWithCreditBureaus: Math.random() > 0.5,
          fundingInterestPersonal: Math.random() > 0.3,
          fundingInterestBusiness: Math.random() > 0.7,
          mailPreference: Math.random() > 0.5 ? "CERTIFIED" : "REGULAR",
          creditReportUrl: "https://example.com/credit-report.pdf",
          lifecycleStage: "MAIL_QUEUED",
          onboardingCompletedAt: new Date(),
        },
      });

      // Create dispute case
      const disputeCase = await prisma.disputeCaseRecord.create({
        data: {
          tenantId: tenant.id,
          clientId: client.id,
          status: "ACTIVE",
        },
      });

      // Create tradelines per bureau
      for (const tradeline of clientData.tradelines) {
        for (const bureau of tradeline.bureaus) {
          const bureauInfo = BUREAUS[bureau];
          const letterText = generateDisputeLetter(
            clientData.firstName,
            clientData.lastName,
            clientData.address,
            clientData.city,
            clientData.state,
            clientData.zip,
            clientData.dob,
            clientData.ssnLast4,
            tradeline.creditor,
            bureau,
            tradeline.type,
            tradeline.balance,
            bureauInfo.name,
            bureauInfo.street,
            bureauInfo.city,
            bureauInfo.state,
            bureauInfo.zip
          );

          await prisma.disputeTradelineRecord.create({
            data: {
              disputeCaseId: disputeCase.id,
              status: "NEW",
              bureau,
              targetType: "BUREAU",
              accountNumberMasked: `****${Math.floor(Math.random() * 9000 + 1000)}`,
              accountType: tradeline.type,
              theoryPrimary: `Inaccurate ${tradeline.status.toLowerCase()} ${tradeline.type.toLowerCase()} reported to ${bureau}`,
              remedyPrimary: "Remove inaccurate item from credit report",
              furnisherName: tradeline.creditor,
              balance: tradeline.balance,
              latestDecisionStage: "INITIATED",
              scoresJson: {},
              letterText,
            },
          });
          totalTradelines++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      clientsCreated: SAMPLE_CLIENTS.length,
      totalTradelines,
      message: `Created ${SAMPLE_CLIENTS.length} clients with ${totalTradelines} tradeline disputes in MAIL_QUEUED stage. Visit /dashboard/mail to see them.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
