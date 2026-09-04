import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/AuthForm";
import { signUpAction } from "@/lib/auth/actions";
import { sanitizeInternalReturnPath } from "@/lib/auth/safe-return-path";
import { getVerifiedServerAuthUserId } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create account",
};

type SignUpPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeInternalReturnPath(params.next);
  const userId = await getVerifiedServerAuthUserId();

  if (userId) {
    redirect(nextPath);
  }

  return (
    <div className="page-stack narrow">
      <h1>Create account</h1>
      <p className="muted">
        Create an account to save your website request. If email confirmation is
        required, your browser draft will remain until you sign in.
      </p>
      <AuthForm
        action={signUpAction}
        submitLabel="Create account"
        nextPath={nextPath}
      />
    </div>
  );
}
