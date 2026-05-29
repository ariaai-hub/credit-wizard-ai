"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  // shown only when identityTheft = "yes"
  reportedIdentityTheft: boolean;
  dateOfBirth: string;
  ssnLast4: string;
  identityTheftNarrative: string;
  authorizedFtcIdentityTheftReport: boolean;
  authorizedCfpbComplaint: boolean;
  authorizedBbbComplaint: boolean;
  // shown to everyone
  disputedWithCreditBureaus: boolean;
  fundingInterestPersonal: boolean;
  fundingInterestBusiness: boolean;
  mailPreference: "REGULAR" | "CERTIFIED";
  creditReportUrl: string;
};

type StepKey =
  | "personal"
  | "identity"
  | "identity-yes"     // DOB + SSN (conditional)
  | "auth"             // FTC/CFPB/BBB (conditional)
  | "credit"
  | "preferences"
  | "credit-report"
  | "review";

type Step = {
  key: StepKey;
  title: string;
  subtitle: string;
};

// Build step sequence dynamically based on identity theft answer
function buildSteps(identityTheft: boolean): Step[] {
  const steps: Step[] = [
    { key: "personal", title: "Let's get started", subtitle: "Tell us a little about yourself" },
    { key: "identity", title: "Have you been a victim of identity theft?", subtitle: "Your answer determines what we ask next" },
  ];
  if (identityTheft) {
    steps.push(
      { key: "identity-yes", title: "Verify your identity", subtitle: "We need a few details to file on your behalf" },
      { key: "auth", title: "Authorize us to act for you", subtitle: "We need your explicit permission to file formal complaints" },
    );
  }
  steps.push(
    { key: "credit", title: "Have you previously disputed items with a credit bureau?", subtitle: "This helps us understand what has already been attempted" },
    { key: "preferences", title: "Your funding goals", subtitle: "Tell us what you're trying to accomplish" },
    { key: "credit-report", title: "Upload your credit report", subtitle: "We need your credit report to identify and dispute inaccurate items" },
    { key: "review", title: "Review and submit", subtitle: "Confirm everything looks right" },
  );
  return steps;
}

function BooleanField({
  label,
  sublabel,
  value,
  onChange,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#091426] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-base font-semibold text-white">{label}</div>
          {sublabel && <div className="mt-1 text-sm text-slate-400">{sublabel}</div>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${value === true ? "bg-emerald-500 text-white" : "border border-white/20 text-slate-400 hover:border-white/40 hover:text-white"}`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${value === false ? "bg-white/20 text-white" : "border border-white/20 text-slate-400 hover:border-white/40 hover:text-white"}`}
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step components ───────────────────────────────────────────────────────────

function StepPersonal({ data, onChange }: { data: FormData; onChange: (d: Partial<FormData>) => void }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">First name</label>
          <input
            type="text"
            value={data.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-[#091426] px-4 py-3 text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            placeholder="First name"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">Last name</label>
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-[#091426] px-4 py-3 text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            placeholder="Last name"
          />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">Email</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-[#091426] px-4 py-3 text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">Phone</label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-[#091426] px-4 py-3 text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            placeholder="+1 (555) 000-0000"
          />
        </div>
      </div>
    </div>
  );
}

function StepIdentity({ data, onChange }: { data: FormData; onChange: (d: Partial<FormData>) => void }) {
  return (
    <div className="grid gap-5">
      <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
        <p className="text-xs text-sky-300">
          <strong>Please be honest in your answer.</strong> This information is used solely to determine the right dispute path for your case. Providing inaccurate information may affect the outcome of your disputes.
        </p>
      </div>
      <BooleanField
        label="Have you ever been a victim of identity theft?"
        sublabel="This includes unauthorized accounts opened in your name, credit card fraud, or any form of identity misuse."
        value={data.reportedIdentityTheft}
        onChange={(val) => {
          // Reset conditional fields when toggling
          onChange({
            reportedIdentityTheft: val,
            dateOfBirth: "",
            ssnLast4: "",
            identityTheftNarrative: "",
            authorizedFtcIdentityTheftReport: false,
            authorizedCfpbComplaint: false,
            authorizedBbbComplaint: false,
          });
        }}
      />
      {data.reportedIdentityTheft && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-amber-300">Describe what happened</label>
          <textarea
            value={data.identityTheftNarrative}
            onChange={(e) => onChange({ identityTheftNarrative: e.target.value })}
            rows={4}
            className="w-full rounded-xl border border-amber-500/20 bg-[#091426] px-4 py-3 text-white placeholder-slate-600 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
            placeholder="Briefly describe the identity theft incident..."
          />
          <p className="mt-2 text-xs text-amber-200/70">This description will be included in formal reports filed on your behalf.</p>
        </div>
      )}
    </div>
  );
}

function StepIdentityYes({ data, onChange }: { data: FormData; onChange: (d: Partial<FormData>) => void }) {
  return (
    <div className="grid gap-5">
      <p className="text-sm text-slate-400">
        To verify your identity and file formal complaints, we need the following.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">Date of birth</label>
          <input
            type="date"
            value={data.dateOfBirth}
            onChange={(e) => onChange({ dateOfBirth: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-[#091426] px-4 py-3 text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">Last 4 of SSN</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            value={data.ssnLast4}
            onChange={(e) => onChange({ ssnLast4: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            className="w-full rounded-xl border border-white/10 bg-[#091426] px-4 py-3 text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            placeholder="1234"
          />
        </div>
      </div>
    </div>
  );
}

function StepAuth({ data, onChange }: { data: FormData; onChange: (d: Partial<FormData>) => void }) {
  const allAuthorized = data.authorizedFtcIdentityTheftReport && data.authorizedCfpbComplaint && data.authorizedBbbComplaint;
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
        <p className="text-sm text-amber-200">
          <strong>Important:</strong> You must authorize all three actions to enroll in this program. If you decline any of these, you will not be able to proceed.
        </p>
      </div>
      <p className="text-sm text-slate-400">
        To take legal and administrative action on your behalf, we need your explicit authorization for each step below.
      </p>
      <BooleanField
        label="File an FTC Identity Theft Report"
        sublabel="Required — select Yes to enroll. Allows us to submit a formal identity theft report with the Federal Trade Commission."
        value={data.authorizedFtcIdentityTheftReport}
        onChange={(val) => onChange({ authorizedFtcIdentityTheftReport: val })}
      />
      <BooleanField
        label="File a CFPB Complaint"
        sublabel="Required — select Yes to enroll. Allows us to file a formal complaint with the Consumer Financial Protection Bureau."
        value={data.authorizedCfpbComplaint}
        onChange={(val) => onChange({ authorizedCfpbComplaint: val })}
      />
      <BooleanField
        label="File a BBB Complaint"
        sublabel="Required — select Yes to enroll. Allows us to file a formal complaint with the Better Business Bureau."
        value={data.authorizedBbbComplaint}
        onChange={(val) => onChange({ authorizedBbbComplaint: val })}
      />
    </div>
  );
}

function StepCredit({ data, onChange }: { data: FormData; onChange: (d: Partial<FormData>) => void }) {
  return (
    <div className="grid gap-5">
      <BooleanField
        label="Have you previously disputed items with a credit bureau?"
        sublabel="This means you contacted Equifax, Experian, or TransUnion directly to dispute inaccurate information."
        value={data.disputedWithCreditBureaus}
        onChange={(val) => onChange({ disputedWithCreditBureaus: val })}
      />
    </div>
  );
}

function StepPreferences({ data, onChange }: { data: FormData; onChange: (d: Partial<FormData>) => void }) {
  return (
    <div className="grid gap-6">
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Select all that apply</div>
        <div className="mb-4 text-sm text-slate-400">
          Let us know what type of funding you&apos;re working toward. This helps us prioritize your dispute strategy.
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onChange({ fundingInterestPersonal: !data.fundingInterestPersonal })}
            className={`rounded-2xl border p-5 text-left transition-all ${data.fundingInterestPersonal ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/10 bg-[#091426] hover:border-white/20"}`}
          >
            <div className="text-base font-semibold text-white">Personal funding</div>
            <div className="mt-1 text-sm text-slate-400">Credit building, consolidation loans, personal credit lines, or refinance</div>
          </button>
          <button
            type="button"
            onClick={() => onChange({ fundingInterestBusiness: !data.fundingInterestBusiness })}
            className={`rounded-2xl border p-5 text-left transition-all ${data.fundingInterestBusiness ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/10 bg-[#091426] hover:border-white/20"}`}
          >
            <div className="text-base font-semibold text-white">Business funding</div>
            <div className="mt-1 text-sm text-slate-400">Business credit, EIN-based lending, SBA loans, or business lines of credit</div>
          </button>
        </div>
      </div>
    </div>
  );
}

function StepCreditReport({ data, onChange, token }: { data: FormData; onChange: (d: Partial<FormData>) => void; token: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [result, setResult] = useState<{ negativesFound: number; tradelinesProcessed: number } | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Please upload a PDF file.");
      setStatus("error");
      return;
    }
    setFile(selected);
    setStatus("uploading");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", selected);

    try {
      const res = await fetch("/api/parse-credit-report", {
        method: "POST",
        headers: { "x-onboarding-token": token },
        body: formData,
      });

      const result = await res.json();
      if (result.ok) {
        setStatus("success");
        setResult({ negativesFound: result.negativesFound ?? 0, tradelinesProcessed: result.tradelinesProcessed ?? 0 });
        onChange({ creditReportUrl: `parsed:${selected.name}` });
      } else {
        setErrorMsg(result.error || "Upload failed. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Upload failed. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="grid gap-4">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
          <p className="text-lg font-semibold text-emerald-300">Credit report uploaded!</p>
          <p className="mt-1 text-sm text-emerald-200/70">
            {result && result.negativesFound > 0
              ? `${result.negativesFound} negative item${result.negativesFound !== 1 ? "s" : ""} identified and queued for dispute.`
              : "No negative items found. Your report is looking good!"}
          </p>
        </div>
        {result && result.negativesFound > 0 && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm text-emerald-200/80">
              <strong>{result.tradelinesProcessed} total account{result.tradelinesProcessed !== 1 ? "s" : ""} parsed</strong> —{" "}
              {result.negativesFound} dispute{result.negativesFound !== 1 ? "s" : ""} queued
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
        <p className="text-sm text-amber-200">
          <strong>Upload your credit report as a PDF.</strong> Download it from the member portal using the link we sent you, then upload it here. Your credit is there for life — we want you in the habit of reading it.
        </p>
      </div>
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
          Credit report (PDF only)
        </label>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 bg-[#091426] p-10 transition-colors hover:border-sky-400/50">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={status === "uploading"}
            className="hidden"
          />
          {status === "uploading" ? (
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
              <p className="mt-3 text-sm text-slate-400">Processing your report...</p>
            </div>
          ) : file ? (
            <div className="text-center">
              <p className="text-sky-300">📄 {file.name}</p>
              <p className="mt-1 text-xs text-slate-500">Click to change file</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-slate-400">Click to upload your PDF</p>
              <p className="mt-1 text-xs text-slate-600">PDF only — max 10MB</p>
            </div>
          )}
        </label>
        {status === "error" && (
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-sm text-rose-400">{errorMsg}</p>
            <button
              type="button"
              onClick={() => { setStatus("idle"); setFile(null); setErrorMsg(""); }}
              className="shrink-0 rounded-full border border-rose-500/30 px-4 py-1.5 text-xs font-semibold text-rose-300 transition-all hover:border-rose-400/50 hover:text-rose-200"
            >
              Retry
            </button>
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#091426] p-5">
        <div className="mb-3 text-sm font-semibold text-white">Accepted formats</div>
        <div className="grid grid-cols-2 gap-3 text-center text-xs text-slate-400">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">PDF</div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">PNG / JPG</div>
          
        </div>
      </div>
    </div>
  );
}

function StepReview({ data }: { data: FormData }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Full name", value: `${data.firstName} ${data.lastName}` },
    { label: "Email", value: data.email || "—" },
    { label: "Phone", value: data.phone || "—" },
    { label: "Identity theft victim", value: data.reportedIdentityTheft ? "Yes" : "No" },
  ];
  if (data.reportedIdentityTheft) {
    rows.push(
      { label: "Date of birth", value: data.dateOfBirth || "—" },
      { label: "SSN (last 4)", value: data.ssnLast4 ? `••••${data.ssnLast4}` : "—" },
      ...(data.identityTheftNarrative ? [{ label: "Identity theft narrative", value: data.identityTheftNarrative }] : []),
      { label: "FTC Authorization", value: data.authorizedFtcIdentityTheftReport ? "Granted" : "Not granted" },
      { label: "CFPB Authorization", value: data.authorizedCfpbComplaint ? "Granted" : "Not granted" },
      { label: "BBB Authorization", value: data.authorizedBbbComplaint ? "Granted" : "Not granted" },
    );
  }
  rows.push(
    { label: "Previously disputed", value: data.disputedWithCreditBureaus ? "Yes" : "No" },
    { label: "Funding interest", value: [data.fundingInterestPersonal ? "Personal" : "", data.fundingInterestBusiness ? "Business" : ""].filter(Boolean).join(", ") || "None" },

    ...(data.creditReportUrl ? [{ label: "Credit report", value: "Submitted ✓" }] : []),
  );

  return (
    <div className="grid gap-4">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 last:border-0">
          <span className="text-sm text-slate-400">{label}</span>
          <span className="text-right text-sm font-medium text-white">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isStepValid(stepKey: StepKey, data: FormData): boolean {
  switch (stepKey) {
    case "personal":
      return !!(data.firstName.trim() && data.lastName.trim());
    case "identity":
      return true;
    case "identity-yes":
      return !!(data.dateOfBirth && data.ssnLast4.length === 4);
    case "auth":
      return true;
    case "credit":
      return true;
    case "preferences":
      return true;
    case "credit-report":
      return true;
    case "review":
      return true;
  }
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

export default function OnboardingWizard({
  token,
  companyName,
  logoUrl,
}: {
  token: string;
  companyName?: string;
  logoUrl?: string | null;
}) {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>(() => buildSteps(false));
  const [stepIndex, setStepIndex] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    reportedIdentityTheft: false,
    dateOfBirth: "",
    ssnLast4: "",
    identityTheftNarrative: "",
    authorizedFtcIdentityTheftReport: false,
    authorizedCfpbComplaint: false,
    authorizedBbbComplaint: false,
    disputedWithCreditBureaus: false,
    fundingInterestPersonal: false,
    fundingInterestBusiness: false,
    mailPreference: "REGULAR",
    creditReportUrl: "",
  });

  const currentStep = steps[stepIndex];

  const update = useCallback((d: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...d }));
  }, []);

  const rebuildSteps = useCallback((identityTheft: boolean) => {
    setSteps(buildSteps(identityTheft));
  }, []);

  const goNext = () => {
    // Special handling after identity step — rebuild steps if needed
    if (currentStep.key === "identity") {
      rebuildSteps(formData.reportedIdentityTheft);
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const goBack = () => {
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/client/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...formData }),
      });
      const result = await res.json();
      if (!result.ok) {
        setSubmitError(result.error ?? "Submission failed. Please try again.");
        setIsSubmitting(false);
        return;
      }
      router.push(result.portalUrl);
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  };

  const isLastStep = stepIndex === steps.length - 1;
  const progress = ((stepIndex + 1) / steps.length) * 100;

  // Filter out the auth/identity-yes dots from progress bar display
  const visibleSteps = steps.filter((s) => s.key !== "auth" || formData.reportedIdentityTheft);

  return (
    <div className="app-frame min-h-screen px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center rounded-full border border-sky-200/20 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-sky-300">
            Client onboarding
          </div>
          <div className="mt-2 text-xs text-slate-500">Step {stepIndex + 1} of {steps.length}</div>
        </div>

        {/* Progress bar */}
        <div className="mb-10 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-sky-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {/* Step dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {visibleSteps.map((step, i) => (
            <div
              key={step.key}
              className={`h-1.5 rounded-full transition-all ${i === stepIndex ? "w-6 bg-sky-400" : i < stepIndex ? "w-1.5 bg-sky-500" : "w-1.5 bg-white/10"}`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="rounded-[1.75rem] border border-white/10 bg-[#0d1a2e] p-6 shadow-xl sm:p-8">
          {/* Company branding */}
          {(companyName || logoUrl) && (
            <div className="mb-6 flex items-center gap-3">
              {logoUrl && (
                <img src={logoUrl} alt={companyName ?? "Company logo"} className="h-8 w-8 rounded-lg object-contain" />
              )}
              {companyName && (
                <div className="text-sm font-semibold text-slate-300">{companyName}</div>
              )}
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white sm:text-2xl">{currentStep.title}</h2>
            {currentStep.subtitle && (
              <p className="mt-2 text-sm text-slate-400">{currentStep.subtitle}</p>
            )}
          </div>

          {/* Step content */}
          <div className="mb-8">
            {currentStep.key === "personal" && <StepPersonal data={formData} onChange={update} />}
            {currentStep.key === "identity" && <StepIdentity data={formData} onChange={update} />}
            {currentStep.key === "identity-yes" && <StepIdentityYes data={formData} onChange={update} />}
            {currentStep.key === "auth" && <StepAuth data={formData} onChange={update} />}
            {currentStep.key === "credit" && <StepCredit data={formData} onChange={update} />}
            {currentStep.key === "preferences" && <StepPreferences data={formData} onChange={update} />}
            {currentStep.key === "credit-report" && <StepCreditReport data={formData} onChange={update} token={token} />}
            {currentStep.key === "review" && <StepReview data={formData} />}
          </div>

          {/* Error */}
          {submitError && (
            <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {submitError}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
              className="rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-slate-400 transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Back
            </button>

            {isLastStep ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-full bg-emerald-500 px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit and enter portal"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={!isStepValid(currentStep.key, formData)}
                className="rounded-full bg-sky-500 px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
