"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ConsumerOnboardingWizardProps {
  token: string;
  clientId: string;
  clientName: string;
}

type Step = 1 | 2 | 3 | 4;

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const STEPS = ["Personal Info", "Credit Goal", "Upload Report", "All Set"];

export default function ConsumerOnboardingWizard({ token, clientId, clientName }: ConsumerOnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Personal Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  // Step 2 — Credit Goal
  const [mainGoal, setMainGoal] = useState("");
  const [bureausChecked, setBureausChecked] = useState<string[]>([]);

  // Step 3 — Report Upload
  const [reportSource, setReportSource] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const toggleBureau = (b: string) =>
    setBureausChecked((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );

  const validateStep = (s: Step): string | null => {
    if (s === 1) {
      if (!firstName.trim()) return "First name is required.";
      if (!lastName.trim()) return "Last name is required.";
      if (!dateOfBirth) return "Date of birth is required.";
      if (!address.trim()) return "Address is required.";
      if (!city.trim()) return "City is required.";
      if (!state) return "State is required.";
      if (!zip.match(/^\d{5}(-\d{4})?$/)) return "Enter a valid ZIP code.";
    }
    if (s === 2) {
      if (!mainGoal) return "Please select your main credit goal.";
      if (bureausChecked.length === 0) return "Select at least one bureau you've checked.";
    }
    if (s === 3) {
      // File optional for now
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(null);
    if (step < 4) setStep((step + 1) as Step);
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) setStep((step - 1) as Step);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/client/consumer-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          personalInfo: { firstName, lastName, dateOfBirth, phone, address, city, state, zip },
          creditGoal: { mainGoal, bureausChecked },
          reportSource,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      setStep(4);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="app-frame text-white min-h-screen flex flex-col">
      <div className="mx-auto w-full max-w-xl flex-1 flex flex-col justify-center px-6 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 mb-4">
            <span className="text-emerald-400">Credit Wizard</span>
          </div>
          <h1 className="text-3xl font-semibold text-white">Let&apos;s get started</h1>
          <p className="mt-2 text-sm text-slate-400">Just a few quick questions — takes about 2 minutes.</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEPS.map((label, i) => (
              <div key={label} className={`text-[10px] font-medium ${i + 1 <= step ? "text-white" : "text-slate-600"}`}>
                {i + 1 < step ? "✓" : i + 1}. {label}
              </div>
            ))}
          </div>
          <div className="h-1 rounded-full bg-white/10">
            <div className="h-1 rounded-full bg-sky-400 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Step 1 — Personal Info */}
        {step === 1 && (
          <div className="public-surface p-6 space-y-4">
            <div className="lux-label">Step 1 — Your Information</div>
            <p className="text-xs text-slate-400">Used to generate dispute letters with your correct name and address.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">First Name *</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none" placeholder="Shomari" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Last Name *</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none" placeholder="Akhdar" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Date of Birth *</label>
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Phone (optional)</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none" placeholder="(305) 555-0100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Street Address *</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none" placeholder="20252 NE 15th Ct" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-medium text-slate-300 mb-1">City *</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none" placeholder="Miami" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-slate-300 mb-1">State *</label>
                <select value={state} onChange={(e) => setState(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none">
                  <option value="" className="bg-[#0a0a0f]">—</option>
                  {US_STATES.map((s) => <option key={s} value={s} className="bg-[#0a0a0f]">{s}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-slate-300 mb-1">ZIP *</label>
                <input value={zip} onChange={(e) => setZip(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none" placeholder="33179" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Credit Goal */}
        {step === 2 && (
          <div className="public-surface p-6 space-y-5">
            <div className="lux-label">Step 2 — Your Credit Goal</div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">What&apos;s your main goal?</label>
              <div className="space-y-2">
                {[
                  { value: "remove_collections", label: "Remove collections & charge-offs" },
                  { value: "fix_errors", label: "Fix errors on my credit report" },
                  { value: "improve_score", label: "Improve my credit score" },
                  { value: "all", label: "All of the above" },
                ].map((opt) => (
                  <label key={opt.value} className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${mainGoal === opt.value ? "border-sky-400 bg-sky-400/5" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                    <input type="radio" name="mainGoal" value={opt.value} checked={mainGoal === opt.value} onChange={() => setMainGoal(opt.value)} className="accent-sky-400" />
                    <span className="text-sm text-white">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Which bureaus have you checked?</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "EQUIFAX", label: "Equifax" },
                  { value: "EXPERIAN", label: "Experian" },
                  { value: "TRANSUNION", label: "TransUnion" },
                  { value: "NOT_SURE", label: "Haven&apos;t checked yet" },
                ].map((b) => (
                  <button key={b.value} type="button" onClick={() => toggleBureau(b.value)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${bureausChecked.includes(b.value) ? "border-sky-400 bg-sky-400/10 text-sky-300" : "border-white/20 text-slate-400 hover:border-white/40"}`}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Report Upload */}
        {step === 3 && (
          <div className="public-surface p-6 space-y-5">
            <div className="lux-label">Step 3 — Your Credit Report</div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">How did you get your report?</label>
              <select value={reportSource} onChange={(e) => setReportSource(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none">
                <option value="" className="bg-[#0a0a0f]">Select one...</option>
                <option value="annualcreditreport" className="bg-[#0a0a0f]">AnnualCreditReport.com (free)</option>
                <option value="credit_karma" className="bg-[#0a0a0f]">Credit Karma</option>
                <option value="credit_hero" className="bg-[#0a0a0f]">Credit Hero</option>
                <option value="other" className="bg-[#0a0a0f]">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Upload your credit report (PDF)</label>
              <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${fileName ? "border-emerald-400/40 bg-emerald-500/5" : "border-white/10 hover:border-white/20"}`}>
                {fileName ? (
                  <>
                    <svg className="h-8 w-8 text-emerald-400 mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-emerald-300 font-medium">{fileName}</span>
                    <button onClick={() => setFileName(null)} className="mt-2 text-xs text-slate-400 hover:text-white">Remove</button>
                  </>
                ) : (
                  <>
                    <svg className="h-8 w-8 text-slate-500 mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <span className="text-sm text-slate-400">Drag & drop or <span className="text-sky-400">browse</span></span>
                    <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFileName(f.name); }} />
                    <span className="text-xs text-slate-600 mt-1">PDF up to 25MB</span>
                  </>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">You can also upload your report later from your portal.</p>
            </div>
          </div>
        )}

        {/* Step 4 — Confirmation */}
        {step === 4 && (
          <div className="public-surface p-6 text-center space-y-5">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">You&apos;re all set, {firstName}!</h2>
              <p className="mt-2 text-sm text-slate-400">Your portal is ready. Here&apos;s what happens next:</p>
            </div>
            <div className="space-y-3 text-left">
              {[
                { icon: "⚡", text: "Upload your credit report from the portal" },
                { icon: "📄", text: "We generate your dispute letters in minutes" },
                { icon: "📬", text: "Download, print, and mail them to the bureaus" },
                { icon: "📊", text: "Track your progress as items get updated" },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3 public-surface-soft p-3 rounded-lg">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-sm text-slate-300">{item.text}</span>
                </div>
              ))}
            </div>
            <button onClick={() => router.push(`/client/${clientId}`)} className="w-full flex h-12 items-center justify-center rounded-xl bg-sky-600 text-sm font-semibold text-white hover:bg-sky-500 transition-colors">
              Go to my portal →
            </button>
          </div>
        )}

        {/* Navigation */}
        {step < 4 && (
          <div className="mt-5 flex gap-3">
            {step > 1 ? (
              <button onClick={handleBack} className="flex-1 flex h-12 items-center justify-center rounded-xl border border-white/10 text-sm text-slate-300 hover:bg-white/5 transition-colors">
                ← Back
              </button>
            ) : <div className="flex-1" />}
            {step < 3 ? (
              <button onClick={handleNext} className="flex-1 flex h-12 items-center justify-center rounded-xl bg-sky-600 text-sm font-semibold text-white hover:bg-sky-500 transition-colors">
                Continue →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 flex h-12 items-center justify-center rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-60">
                {submitting ? "Saving..." : "Complete Setup →"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
