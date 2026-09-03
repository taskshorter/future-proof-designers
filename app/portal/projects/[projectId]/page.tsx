import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { loadProjectResumeDetail } from "@/lib/projects/actions";

export const metadata: Metadata = {
  title: "Project",
};

export const dynamic = "force-dynamic";

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId } = await params;
  const detail = await loadProjectResumeDetail(projectId);

  if (!detail) {
    notFound();
  }

  return (
    <div className="page-stack">
      <h1>{detail.project.projectName}</h1>
      <p className="muted">Customer: {detail.project.customerName}</p>
      <section className="panel">
        <h2>First three answers</h2>
        {detail.intake ? (
          <dl className="review-list">
            <div>
              <dt>Existing website</dt>
              <dd>{detail.intake.hasExistingWebsite ? "Yes" : "No"}</dd>
            </div>
            {detail.intake.existingWebsiteUrl ? (
              <div>
                <dt>Current website URL</dt>
                <dd>{detail.intake.existingWebsiteUrl}</dd>
              </div>
            ) : null}
            <div>
              <dt>Business description</dt>
              <dd>{detail.intake.businessDescription}</dd>
            </div>
            <div>
              <dt>Outcome answer</dt>
              <dd>{detail.intake.thirdAnswer}</dd>
            </div>
          </dl>
        ) : (
          <p className="muted">No intake answers are available yet.</p>
        )}
      </section>
      <p className="muted">
        Continue onboarding will arrive in B2. This page confirms the protected
        resume detail contract only.
      </p>
      <Link href="/portal">Back to projects</Link>
    </div>
  );
}
