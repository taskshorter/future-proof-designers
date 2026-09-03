import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/AuthForm";
import { signUpAction } from "@/lib/auth/actions";
import { sanitizeInternalReturnPath } from "@/lib/auth/safe-return-path";

export const metadata: Metadata = {
  title: "Create account",
};

type SignUpPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;

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
        nextPath={sanitizeInternalReturnPath(params.next)}
      />
    </div>
  );
}
