import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/AuthForm";
import { signInAction } from "@/lib/auth/actions";
import { sanitizeInternalReturnPath } from "@/lib/auth/safe-return-path";
import { getVerifiedServerAuthUserId } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in",
};

type SignInPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeInternalReturnPath(params.next);
  const userId = await getVerifiedServerAuthUserId();

  if (userId) {
    redirect(nextPath);
  }

  return (
    <div className="page-stack narrow">
      <h1>Sign in</h1>
      <p className="muted">Use your email and password to continue your saved request.</p>
      <AuthForm
        action={signInAction}
        submitLabel="Sign in"
        nextPath={nextPath}
      />
    </div>
  );
}
