import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PortalResumePanel } from "@/components/portal/PortalResumePanel";
import { loadPortalResumeState } from "@/lib/projects/actions";

export const metadata: Metadata = {
  title: "Portal",
};

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const state = await loadPortalResumeState();

  if (!state.authenticated) {
    redirect("/sign-in?next=/portal");
  }

  return (
    <div className="page-stack">
      <h1>Your projects</h1>
      <p className="muted">Resume onboarding for projects you are authorized to access.</p>
      <PortalResumePanel projects={state.projects} errorMessage={state.errorMessage} />
      <p>
        <Link href="/start">Start another website request</Link>
      </p>
    </div>
  );
}
