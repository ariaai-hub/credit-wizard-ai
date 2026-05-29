import { ClientPortal } from "@/components/client-portal";
import { buildClientPortalViewModel } from "@/lib/client-portal";
import { buildReportEligibilityStatus } from "@/lib/report-eligibility";

export default function ClientPortalPreviewPage() {
  const eligibility = {
    reportedIdentityTheft: true,
    identityTheftNarrative: "I never opened the Discover card showing on my report, and the Texas address listed there is not mine.",
    disputedWithCreditBureaus: true,
    authorizedFtcIdentityTheftReport: true,
    authorizedCfpbComplaint: true,
    authorizedBbbComplaint: true,
  };
  const reportEligibility = buildReportEligibilityStatus(eligibility);
  const model = buildClientPortalViewModel({
    clientName: "Jasmine Carter",
    firstName: "Jasmine",
    email: "support@thecreditteam.com",
    providerName: "Credit Hero",
    providerSignupUrl: "https://creditheroscore.com/redirect.asp?guid=JT03ZHMZ51XG&sid=WPMQN9X06",
    lifecycleStage: "STRATEGY_READY",
    providerStatus: "SYNCED",
    mailPreference: "CERTIFIED",
    fundingInterestPersonal: true,
    fundingInterestBusiness: false,
    createdAt: new Date("2026-04-17T12:15:00-04:00"),
    updatedAt: new Date("2026-04-19T21:25:00-04:00"),
    negativeItemCount: 9,
    submittedDisputeCount: 6,
    deletionCount: 4,
    documentCount: 3,
    requiredDocumentCount: 3,
  });

  return (
    <>
      <ClientPortal model={model} previewLabel="Client portal preview" />

      <section className="bg-stone-100 px-4 pb-10 sm:px-6 sm:pb-12 md:px-10">
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-1">
          <article className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Readiness preview</div>
            <h2 className="mt-3 text-2xl font-semibold text-stone-950">{reportEligibility.summaryLabel}</h2>
            <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
              Preview client is fully ready for automated complaint handling and has already requested funding review later in the journey.
            </div>
            <div className="mt-4 rounded-3xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
              <div>Identity theft flagged: <span className="font-semibold text-stone-950">Yes</span></div>
              <div className="mt-2">FTC authorized: <span className="font-semibold text-stone-950">Yes</span></div>
              <div className="mt-2">CFPB authorized: <span className="font-semibold text-stone-950">Yes</span></div>
              <div className="mt-2">BBB authorized: <span className="font-semibold text-stone-950">Yes</span></div>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
