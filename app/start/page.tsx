import type { Metadata } from "next";

import { DiscoveryFlow } from "@/components/onboarding/DiscoveryFlow";

export const metadata: Metadata = {
  title: "Start",
};

export default function StartPage() {
  return (
    <div className="page-stack">
      <h1>Start your website project</h1>
      <p className="muted">
        Answer three short questions. Your answers stay in this browser until you
        create an account and save the project.
      </p>
      <DiscoveryFlow />
    </div>
  );
}
