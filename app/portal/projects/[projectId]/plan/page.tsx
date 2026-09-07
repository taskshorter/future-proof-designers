import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { WebsitePlanPanel } from "@/components/website-plan/WebsitePlanPanel";
import { loadWebsitePlanPageData } from "@/lib/website-plan/actions";

export const metadata: Metadata = {
  title: "Website Plan",
};

export const dynamic = "force-dynamic";

type WebsitePlanPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function WebsitePlanPage({ params }: WebsitePlanPageProps) {
  const { projectId } = await params;
  const result = await loadWebsitePlanPageData(projectId);

  if (result.status === "reauth") {
    redirect(result.signInPath);
  }

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "error") {
    return (
      <div className="page-stack">
        <h1>Website Plan unavailable</h1>
        <p className="form-error">{result.message}</p>
        <Link href={`/portal/projects/${encodeURIComponent(projectId)}`}>
          Back to project
        </Link>
      </div>
    );
  }

  return (
    <WebsitePlanPanel
      projectId={projectId}
      projectName={result.resume.project.projectName}
      initialPlan={result.plan}
    />
  );
}
