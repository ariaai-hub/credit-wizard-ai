import type { ClientLifecycleStage, CreditProviderClientStatus, MailPreference } from "@prisma/client";

export type ClientPortalViewModel = {
  clientName: string;
  firstName: string;
  email?: string | null;
  providerName: string;
  providerSignupUrl?: string | null;
  lifecycleStage: ClientLifecycleStage;
  providerStatus: CreditProviderClientStatus;
  mailPreference: MailPreference;
  fundingInterestPersonal: boolean;
  fundingInterestBusiness: boolean;
  createdAtLabel: string;
  updatedAtLabel: string;
  nextStepTitle: string;
  nextStepBody: string;
  progressLabel: string;
  progressPercent: number;
  statusChips: string[];
  onboardingSummaryLabel: string;
  checklist: Array<{ label: string; complete: boolean; detail: string }>;
  timeline: Array<{ label: string; detail: string; complete: boolean; current?: boolean }>;
  negativeItemCount: number;
  submittedDisputeCount: number;
  deletionCount: number;
  documentCount: number;
  requiredDocumentCount: number;
  missingItemCount: number;
  supportStatusLabel: string;
  fundingLane: {
    badge: string;
    title: string;
    detail: string;
    readinessLabel: string;
  };
};

function formatStageLabel(stage: ClientLifecycleStage) {
  return stage.toLowerCase().replaceAll("_", " ");
}

function formatProviderStatus(status: CreditProviderClientStatus) {
  return status.toLowerCase().replaceAll("_", " ");
}

function formatDateLabel(value: Date) {
  return value.toLocaleString();
}

function getProgressPercent(stage: ClientLifecycleStage, providerStatus: CreditProviderClientStatus) {
  const base = {
    INTAKE_RECEIVED: 15,
    DOCS_PENDING: 30,
    READY_FOR_STRATEGY: 50,
    STRATEGY_READY: 70,
    LETTER_GENERATED: 85,
    MAIL_QUEUED: 100,
    MAIL_SENT: 100,
  }[stage] ?? 0;

  if (providerStatus === "SIGNUP_COMPLETED" || providerStatus === "SYNCED") {
    return Math.min(base + 10, 100);
  }

  return base;
}

function getNextStep(stage: ClientLifecycleStage, providerStatus: CreditProviderClientStatus, providerName: string) {
  if (providerStatus === "SIGNUP_LINK_READY" || providerStatus === "SIGNUP_SENT") {
    return {
      title: `Complete your ${providerName} signup`,
      body: `Finish the provider signup so your file can keep moving without delay.`,
    };
  }

  if (stage === "INTAKE_RECEIVED") {
    return {
      title: "We are checking what is missing",
      body: "Your intake is in. We are now confirming the remaining onboarding items needed to fully activate the file.",
    };
  }

  if (stage === "DOCS_PENDING") {
    return {
      title: "Send any missing onboarding items",
      body: "Anything still missing is shown in red below so you know exactly what still needs to be handled.",
    };
  }

  if (stage === "READY_FOR_STRATEGY") {
    return {
      title: "Your strategy is being built",
      body: "The file is moving through review now and the next major step is dispute preparation.",
    };
  }

  if (stage === "STRATEGY_READY") {
    return {
      title: "Your disputes are being prepared",
      body: "Your file is ready for dispute execution and fulfillment movement.",
    };
  }

  if (stage === "LETTER_GENERATED") {
    return {
      title: "Your dispute letters are prepared",
      body: "Your file is in fulfillment now and moving toward outgoing mail.",
    };
  }

  return {
    title: "Your file is in fulfillment",
    body: "Your case is already in the final movement stage right now.",
  };
}

function buildFundingLane(input: {
  fundingInterestPersonal: boolean;
  fundingInterestBusiness: boolean;
  lifecycleStage: ClientLifecycleStage;
  deletionCount: number;
}) {
  const wantsFunding = input.fundingInterestPersonal || input.fundingInterestBusiness;

  if (!wantsFunding) {
    return {
      badge: "Need funding",
      title: "Tell us if you want funding after your file improves",
      detail: "Turn on personal funding, business funding, or both. Once your file is stronger, we can automatically check whether you look like a funding candidate.",
      readinessLabel: "Not started",
    };
  }

  if (input.deletionCount > 0 || ["STRATEGY_READY", "LETTER_GENERATED", "MAIL_QUEUED"].includes(input.lifecycleStage)) {
    return {
      badge: "Get funding",
      title: "Your funding candidacy check is active",
      detail: "You asked for funding and your file has enough movement for ongoing candidacy checks as new results come in.",
      readinessLabel: "Ready for review",
    };
  }

  return {
    badge: "Want funding",
    title: "Your funding request is on file",
    detail: "We have your request. As your disputes progress and your file improves, we will automatically re-check whether you are ready for funding review.",
    readinessLabel: "In progress",
  };
}

export function buildClientPortalViewModel(input: {
  clientName: string;
  firstName: string;
  email?: string | null;
  providerName: string;
  providerSignupUrl?: string | null;
  lifecycleStage: ClientLifecycleStage;
  providerStatus: CreditProviderClientStatus;
  mailPreference: MailPreference;
  fundingInterestPersonal: boolean;
  fundingInterestBusiness: boolean;
  createdAt: Date;
  updatedAt: Date;
  negativeItemCount: number;
  submittedDisputeCount: number;
  deletionCount: number;
  documentCount: number;
  requiredDocumentCount: number;
}): ClientPortalViewModel {
  const nextStep = getNextStep(input.lifecycleStage, input.providerStatus, input.providerName);
  const progressPercent = getProgressPercent(input.lifecycleStage, input.providerStatus);
  const documentsReady = input.documentCount >= input.requiredDocumentCount;
  const providerReady = input.providerStatus === "SIGNUP_COMPLETED" || input.providerStatus === "SYNCED";
  const strategyReady = ["STRATEGY_READY", "LETTER_GENERATED", "MAIL_QUEUED"].includes(input.lifecycleStage);
  const disputeStarted = input.submittedDisputeCount > 0 || ["LETTER_GENERATED", "MAIL_QUEUED"].includes(input.lifecycleStage);

  const checklist = [
    {
      label: "Intake received",
      complete: true,
      detail: "Your information is already on file.",
    },
    {
      label: `${input.providerName} signup completed`,
      complete: providerReady,
      detail: providerReady
        ? `${input.providerName} access is already linked to your file.`
        : `We still need this signup finished before the file can move at full speed.`,
    },
    {
      label: "Documents ready",
      complete: documentsReady,
      detail: documentsReady
        ? "Required documents are in and the file can keep moving."
        : `We have ${input.documentCount} of ${input.requiredDocumentCount} required onboarding documents so far.`,
    },
    {
      label: "Strategy prepared",
      complete: strategyReady,
      detail: strategyReady
        ? "Your file has already reached the strategy phase."
        : "We are still moving toward final strategy prep.",
    },
    {
      label: "Dispute execution started",
      complete: disputeStarted,
      detail: disputeStarted
        ? "Negative items are already moving through the dispute process."
        : "Dispute execution has not started yet.",
    },
  ];

  const completedCount = checklist.filter((item) => item.complete).length;
  const missingItemCount = checklist.filter((item) => !item.complete).length;
  const fundingLane = buildFundingLane({
    fundingInterestPersonal: input.fundingInterestPersonal,
    fundingInterestBusiness: input.fundingInterestBusiness,
    lifecycleStage: input.lifecycleStage,
    deletionCount: input.deletionCount,
  });

  return {
    clientName: input.clientName,
    firstName: input.firstName,
    email: input.email,
    providerName: input.providerName,
    providerSignupUrl: input.providerSignupUrl,
    lifecycleStage: input.lifecycleStage,
    providerStatus: input.providerStatus,
    mailPreference: input.mailPreference,
    fundingInterestPersonal: input.fundingInterestPersonal,
    fundingInterestBusiness: input.fundingInterestBusiness,
    createdAtLabel: formatDateLabel(input.createdAt),
    updatedAtLabel: formatDateLabel(input.updatedAt),
    nextStepTitle: nextStep.title,
    nextStepBody: nextStep.body,
    progressLabel: `${progressPercent}% complete`,
    progressPercent,
    statusChips: [
      formatStageLabel(input.lifecycleStage),
      formatProviderStatus(input.providerStatus),
      `${input.mailPreference.toLowerCase()} mail`,
      input.fundingInterestPersonal || input.fundingInterestBusiness ? "funding requested" : "funding optional",
    ],
    onboardingSummaryLabel: `${completedCount}/${checklist.length} onboarding items complete`,
    checklist,
    timeline: [
      {
        label: "Onboarding",
        detail: "We received your information and started verifying what is needed for the file.",
        complete: true,
      },
      {
        label: "Documents verified",
        detail: "Your core documents and provider connection are confirmed so the file can move without delays.",
        complete: documentsReady && providerReady,
        current: !documentsReady || !providerReady,
      },
      {
        label: "Disputes in progress",
        detail: "Disputes are prepared, generated, and moved into execution.",
        complete: disputeStarted,
        current: strategyReady && !disputeStarted,
      },
      {
        label: "Results tracked",
        detail: "Deletions and other file changes are tracked as results come in.",
        complete: input.deletionCount > 0 || input.lifecycleStage === "MAIL_QUEUED",
        current: disputeStarted && input.deletionCount === 0,
      },
      {
        label: "Funding review",
        detail: "As your file improves, we can check whether you look ready for funding review.",
        complete: fundingLane.readinessLabel === "Ready for review",
        current: fundingLane.readinessLabel === "In progress",
      },
    ],
    negativeItemCount: input.negativeItemCount,
    submittedDisputeCount: input.submittedDisputeCount,
    deletionCount: input.deletionCount,
    documentCount: input.documentCount,
    requiredDocumentCount: input.requiredDocumentCount,
    missingItemCount,
    supportStatusLabel: "Support online",
    fundingLane,
  };
}
