import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/AuthForm";
import { signInAction } from "@/lib/auth/actions";

export const metadata: Metadata = {
  title: "Sign in",
};

type SignInPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;

  return (
    <div className="page-stack narrow">
      <h1>Sign in</h1>
      <p className="muted">Use your email and password to continue your saved request.</p>
      <AuthForm action={signInAction} submitLabel="Sign in" nextPath={params.next ?? "/portal"} />
    </div>
  );
}
