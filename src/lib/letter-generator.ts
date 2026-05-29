import { BUREAU_ADDRESSES, type Bureau } from "./bureau-addresses";

export interface LetterClient {
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  ssnLast4?: string | null;
}

export interface LetterTradeline {
  creditor: string;
  accountNumber?: string;
  date: string;
  balance: number | null;
  status: "GOOD" | "CLOSED" | "PAST_DUE" | "COLLECTION";
  category: string;
}

export function generateDisputeLetter(
  client: LetterClient,
  tradeline: LetterTradeline,
  bureau: Bureau,
): string {
  const addr = BUREAU_ADDRESSES[bureau];
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const statusReason: Record<string, string> = {
    CLOSED: "account was closed",
    PAST_DUE: "account is past due",
    COLLECTION: "account has been referred to collections",
    GOOD: "account status is disputed",
  };
  const reason = statusReason[tradeline.status] ?? "account status is inaccurate";

  return `CREDIT DISPUTE LETTER — FCRA § 611

${today}

${addr.name}
${addr.street}
${addr.city}, ${addr.state}  ${addr.zip}

RE: DISPUTE OF CONSUMER CREDIT REPORT — ${tradeline.creditor.toUpperCase()}
Account Reference: ${tradeline.accountNumber ? `****${tradeline.accountNumber}` : "N/A"}
Consumer: ${client.firstName} ${client.lastName}${client.dateOfBirth ? `  |  DOB: ${client.dateOfBirth}` : ""}${client.ssnLast4 ? `  |  SSN: ****${client.ssnLast4}` : ""}

Dear Sir or Madam:

I am writing to formally dispute the above-referenced tradeline appearing on my credit report maintained by ${addr.name} ("Bureau") under my consumer file. I believe this item is inaccurate and incomplete in violation of the Fair Credit Reporting Act, 15 U.S.C. § 611 et seq.

IDENTIFICATION OF DISPUTED ITEM
Creditor: ${tradeline.creditor}
Date Reported: ${tradeline.date || "Unknown"}
Balance: ${tradeline.balance !== null ? `$${tradeline.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "N/A"}
Status: ${reason.charAt(0).toUpperCase() + reason.slice(1)}

NATURE OF DISPUTE
The above-listed account is being reported inaccurately. Specifically, ${reason}. Under FCRA § 611(a), upon receiving a dispute notice, the Bureau is required to conduct a reasonable reinvestigation and correct or delete any information found to be inaccurate or incomplete within 30 days of receipt.

REQUEST FOR INVESTIGATION AND REMOVAL
Pursuant to 15 U.S.C. § 611(a), I respectfully request that the Bureau:
1. Conduct a prompt and thorough reinvestigation of the above-referenced tradeline;
2. Verify the accuracy and completeness of all information associated with this account;
3. Correct any inaccurate, incomplete, or unverifiable information, or permanently delete this tradeline from my credit file if verification cannot be completed.

If the furnisher of this information fails to respond within the reinvestigation period, or if the information cannot be verified as accurate and complete, I demand that this item be deleted from my credit report pursuant to FCRA § 611(a)(5)(B).

SUPPORTING DOCUMENTATION
I have attached a copy of my credit report and any supporting documentation relevant to this dispute. Please note that under FCRA § 609(a)(1) I am entitled to receive all information in my consumer file.

RESPONSE REQUIRED
Please send written confirmation of the results of your reinvestigation to me at the address associated with this dispute, or to our representative at the address on file. If this item is deleted or corrected, please confirm the same in writing.

This letter constitutes a formal dispute under FCRA § 611. I look forward to your prompt resolution.

Sincerely,

${client.firstName} ${client.lastName}
${client.dateOfBirth ? `Date of Birth: ${client.dateOfBirth}` : ""}
${client.ssnLast4 ? `Last 4 of SSN: ${client.ssnLast4}` : ""}

---
Automated dispute generated pursuant to FCRA § 611 | 15 U.S.C. § 1681i
`;
}