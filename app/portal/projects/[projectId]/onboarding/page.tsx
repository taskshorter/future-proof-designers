import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DeeperOnboardingFlow } from "@/components/onboarding/DeeperOnboardingFlow";
import { loadProjectOnboardingPageData } from "@/lib/onboarding/actions";

export const metadata: Metadata = {
  title: "Onboarding",
};

export const dynamic = "force-dynamic";

type OnboardingPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectOnboardingPage({ params }: OnboardingPageProps) {
  const { projectId } = await params;
  const result = await loadProjectOnboardingPageData(projectId);

  if (result.status === "reauth") {
    redirect(result.signInPath);
  }

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "error") {
    return (
      <div className="page-stack">
        <h1>Onboarding unavailable</h1>
        <p className="form-error">{result.message}</p>
        <Link href={`/portal/projects/${encodeURIComponent(projectId)}`}>Back to project</Link>
      </div>
    );
  }

  return (
    <DeeperOnboardingFlow
      projectId={projectId}
      resume={result.resume}
      onboarding={result.onboarding}
      research={result.research}
    />
  );
}
