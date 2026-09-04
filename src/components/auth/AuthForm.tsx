"use client";

import { useActionState } from "react";

import type { AuthActionState } from "@/lib/auth/actions";

type AuthFormProps = {
  action: (prev: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  submitLabel: string;
  nextPath?: string;
};

export function AuthForm({ action, submitLabel, nextPath }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="auth-form">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      <label>
        Email
        <input type="email" name="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
      {state.success && state.signInPath ? (
        <p>
          <a href={state.signInPath}>Sign in to continue</a>
        </p>
      ) : null}
      <button type="submit" disabled={pending}>
        {pending ? "Working…" : submitLabel}
      </button>
    </form>
  );
}
