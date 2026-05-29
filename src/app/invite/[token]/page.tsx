import { notFound } from "next/navigation";

import { SubmitButton } from "@/components/submit-button";
import { getProviderAffiliateLink } from "@/lib/credit-provider";
import { getInvitationByToken } from "@/lib/tenant";

import { acceptInvitationAction } from "./actions";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    notFound();
  }

  if (invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    return (
      <main className="min-h-screen bg-stone-100 px-6 py-12 md:px-10">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Invitation unavailable</h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            This invitation has expired or has already been used.
          </p>
        </div>
      </main>
    );
  }

  const acceptAction = acceptInvitationAction.bind(null, token);
  const providerAffiliateLink = getProviderAffiliateLink(invitation.tenant.creditProvider);

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-12 md:px-10">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-stone-200 bg-stone-900 p-8 text-stone-50 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
            Staff invitation
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Join {invitation.tenant.name}</h1>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            This invitation will create your tenant-scoped account and sign you into the dashboard.
          </p>
          <div className="mt-6 rounded-2xl border border-stone-700 bg-stone-800/80 p-4 text-sm text-stone-300">
            <div>Email: {invitation.email}</div>
            <div>Role: {invitation.role}</div>
            <div>Expires: {invitation.expiresAt.toLocaleString()}</div>
          </div>
          {providerAffiliateLink ? (
            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-50">
              <div className="font-semibold uppercase tracking-[0.14em] text-emerald-200">Default provider signup link</div>
              <p className="mt-2 leading-6 text-emerald-100">
                If your team needs to send people to {invitation.tenant.creditProvider}, use the default signup link below.
              </p>
              <a href={providerAffiliateLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex font-semibold underline underline-offset-4">
                Open provider signup link
              </a>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <form action={acceptAction} className="grid gap-5">
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              Phone (optional)
              <input name="phone" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              Password
              <input type="password" name="password" minLength={10} required className="rounded-2xl border border-stone-300 px-4 py-3 outline-none ring-0" />
            </label>
            <SubmitButton className="inline-flex items-center justify-center rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800" pendingLabel="Accepting invitation...">
              Accept invitation
            </SubmitButton>
          </form>
        </section>
      </div>
    </main>
  );
}
