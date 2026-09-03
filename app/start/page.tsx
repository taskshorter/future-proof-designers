import type { Metadata } from "next";

import { DiscoveryFlow } from "@/components/onboarding/DiscoveryFlow";
import { getVerifiedServerAuthUserId } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Start",
};

export default async function StartPage() {
  const userId = await getVerifiedServerAuthUserId();
  const isSignedIn = Boolean(userId);

  return (
    <div className="page-stack">
      <h1>Start your website project</h1>
      <p className="muted">
        {isSignedIn
          ? "Answer three short questions. Your answers stay in this browser until you save the project."
          : "Answer three short questions. Your answers stay in this browser until you create an account and save the project."}
      </p>
      <DiscoveryFlow isSignedIn={isSignedIn} />
    </div>
  );
}
