"use client";

import { useActionState, useEffect } from "react";

import { SubmitButton } from "@/components/submit-button";

import { type SignInActionState, signInAction } from "./actions";

const initialState: SignInActionState = {
  ok: false,
  message: "",
};

export function SignInForm() {
  const [state, formAction] = useActionState(signInAction, initialState);

  useEffect(() => {
    if (state.ok && state.redirectUrl) {
      window.location.assign(state.redirectUrl);
    }
  }, [state]);

  return (
    <form action={formAction} className="mt-8 grid gap-5 rounded-[1.75rem] border border-white/10 bg-white/5 p-6 text-white shadow-sm">
      <label className="grid gap-2 text-sm font-medium text-slate-200">
        Email
        <input type="email" name="email" required className="public-input px-4 py-3 outline-none ring-0" />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-200">
        Password
        <input type="password" name="password" required className="public-input px-4 py-3 outline-none ring-0" />
      </label>

      {state.message ? (
        <div
          className={`rounded-[1.2rem] border px-4 py-4 text-sm leading-7 ${
            state.ok
              ? "border-sky-400/25 bg-sky-500/10 text-sky-100"
              : "border-rose-400/25 bg-rose-500/10 text-rose-100"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <SubmitButton className="lux-button-primary inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition" pendingLabel="Signing in...">
        Sign in
      </SubmitButton>
    </form>
  );
}
