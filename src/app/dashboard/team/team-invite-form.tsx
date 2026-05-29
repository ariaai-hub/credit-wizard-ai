"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserRole } from "@prisma/client";

import { SubmitButton } from "@/components/submit-button";

import { type InviteStaffActionState, inviteStaffAction } from "./actions";

const initialState: InviteStaffActionState = {
  ok: false,
  message: "",
};

function formatRoleLabel(role: string) {
  switch (role) {
    case "OWNER":
      return "Owner";
    case "ADMIN":
      return "Admin";
    case "SUPPORT":
      return "Support";
    case "ANALYST":
      return "Analyst";
    case "MAIL_TEAM":
      return "Operations";
    default:
      return role.toLowerCase();
  }
}

export function TeamInviteForm({
  assignableRoles,
}: {
  assignableRoles: UserRole[];
}) {
  const [state, formAction] = useActionState(inviteStaffAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-6 grid gap-4">
      <label className="grid gap-2 text-sm font-medium text-slate-200">
        Staff email
        <input name="email" type="email" required className="public-input px-4 py-3" />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-200">
        Staff name
        <input name="name" className="public-input px-4 py-3" />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-200">
        Role
        <select name="role" defaultValue={UserRole.SUPPORT} className="public-input px-4 py-3">
          {assignableRoles.map((role) => (
            <option key={role} value={role} className="bg-slate-950 text-white">
              {formatRoleLabel(role)}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton className="lux-button-primary w-full" pendingLabel="Sending invite...">
        Invite staff member
      </SubmitButton>

      {state.message ? (
        <div
          className={`rounded-[1.2rem] border px-4 py-3 text-sm leading-6 ${
            state.ok
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
              : "border-rose-400/30 bg-rose-500/10 text-rose-100"
          }`}
        >
          <div>{state.message}</div>
          {state.inviteUrl ? (
            <a
              href={state.inviteUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex font-semibold text-white underline underline-offset-4"
            >
              Open invite link
            </a>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
