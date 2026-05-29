import { requireSession } from "@/lib/auth";
import { getCompanyProfile } from "./actions";
import { CompanyProfileForm } from "./company-profile-form";
import { redirect } from "next/navigation";

export default async function CompanyProfilePage() {
  const session = await requireSession();
  const profile = await getCompanyProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header>
          <div className="lux-label">White label</div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
            Company Profile
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Set your brand colors, logo, and mailing preferences. These apply to the client portal your clients see.
          </p>
        </header>

        <CompanyProfileForm profile={profile} />
      </div>
    </main>
  );
}
