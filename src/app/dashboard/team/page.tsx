import { UserRole } from "@prisma/client";

import { SubmitButton } from "@/components/submit-button";
import { isSuperAdmin } from "@/lib/admin";
import { requireSession } from "@/lib/auth";
import { formatRoleLabel } from "@/lib/company-workspace";
import { getPendingInvitations, getTenantTeamSnapshot } from "@/lib/users";
import { getSeatUsage } from "@/lib/tenant";

import { resendInvitationAction, revokeInvitationAction } from "./actions";
import { TeamInviteForm } from "./team-invite-form";

const companyAssignableRoles = [UserRole.ADMIN, UserRole.SUPPORT, UserRole.ANALYST];
const internalAssignableRoles = [...companyAssignableRoles, UserRole.MAIL_TEAM];

export default async function TeamPage() {
  const session = await requireSession();
  const internalOwner = isSuperAdmin(session.email);
  const assignableRoles = internalOwner ? internalAssignableRoles : companyAssignableRoles;

  const [team, invitations, seatUsage] = await Promise.all([
    getTenantTeamSnapshot(session.tenantId),
    getPendingInvitations(session.tenantId),
    getSeatUsage(session.tenantId),
  ]);

  return (
    <main className="app-frame px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="public-surface p-8 md:p-10">
          <div className="lux-label">Team</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">Manage company access</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
            Invite staff, control seats, and keep access scoped to your company only.
          </p>
        </header>

        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <article className="public-surface p-6 md:p-8">
            <div className="lux-label">Seats</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Current capacity</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="public-surface-soft p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Staff seats</div>
                <div className="mt-2 text-3xl font-semibold text-white">{seatUsage.seatLimit}</div>
              </div>
              <div className="public-surface-soft p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Used staff seats</div>
                <div className="mt-2 text-3xl font-semibold text-white">{seatUsage.usedSeats}</div>
              </div>
              <div className="public-surface-soft p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Pending invites</div>
                <div className="mt-2 text-3xl font-semibold text-white">{seatUsage.pendingInvites}</div>
              </div>
              <div className="public-surface-soft p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">Remaining</div>
                <div className="mt-2 text-3xl font-semibold text-white">{seatUsage.remainingSeats}</div>
              </div>
            </div>

            <TeamInviteForm assignableRoles={assignableRoles} />
          </article>

          <article className="public-surface p-6 md:p-8">
            <div className="lux-label">Access list</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Current team</h2>

            <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#091426]">
              <table className="min-w-full divide-y divide-white/10 text-sm text-slate-200">
                <thead className="bg-white/[0.04] text-left text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {team.map((member) => (
                    <tr key={member.id}>
                      <td className="px-4 py-3 font-medium text-white">{member.name}</td>
                      <td className="px-4 py-3">{member.email}</td>
                      <td className="px-4 py-3">{formatRoleLabel(member.role)}</td>
                      <td className="px-4 py-3">{member.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="mt-8 text-lg font-semibold text-white">Pending invitations</h3>
            <div className="mt-4 space-y-3">
              {invitations.length === 0 ? (
                <div className="public-surface-soft p-4 text-sm text-slate-300">No pending invitations.</div>
              ) : (
                invitations.map((invite) => (
                  <div key={invite.id} className="public-surface-soft p-4 text-sm text-slate-200">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="font-medium text-white">{invite.email}</div>
                        <div className="mt-1">Role: {formatRoleLabel(invite.role)}</div>
                        <div>Expires: {invite.expiresAt.toLocaleString()}</div>
                        <div>Status: {invite.deliveryStatus}</div>
                        <div className="mt-2 break-all text-xs text-slate-400">Invite path: /invite/{invite.token}</div>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <form action={resendInvitationAction.bind(null, invite.id)}>
                          <SubmitButton className="lux-button-secondary" pendingLabel="Resending...">
                            Resend
                          </SubmitButton>
                        </form>
                        <form action={revokeInvitationAction.bind(null, invite.id)}>
                          <SubmitButton className="lux-button-ghost !border-rose-400/40 !text-rose-200" pendingLabel="Revoking...">
                            Revoke
                          </SubmitButton>
                        </form>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
