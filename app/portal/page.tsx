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

  if (state.status === "unauthenticated") {
    redirect("/sign-in?next=/portal");
  }

  if (state.status === "reauth") {
    redirect(state.signInPath);
  }

  if (state.status === "error") {
    return (
      <div className="page-stack">
        <h1>Your projects</h1>
        <p className="form-error">{state.message}</p>
        {state.category === "temporary_failure" ? (
          <p className="muted">Please try again in a moment.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="page-stack">
      <h1>Your projects</h1>
      <p className="muted">Resume onboarding for projects you are authorized to access.</p>
      <PortalResumePanel projects={state.projects} />
      {state.projects.length > 0 ? (
        <p>
          <Link href="/start">Start another website request</Link>
        </p>
      ) : null}
    </div>
  );
}
