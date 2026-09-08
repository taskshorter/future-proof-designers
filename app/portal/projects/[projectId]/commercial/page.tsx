import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CommercialProposalPanel } from "@/components/commercial/CommercialProposalPanel";
import { loadCommercialPageData } from "@/lib/commercial/actions";

export const metadata: Metadata = {
  title: "Proposal & Pricing",
};

export const dynamic = "force-dynamic";

type CommercialPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectCommercialPage({ params }: CommercialPageProps) {
  const { projectId } = await params;
  const result = await loadCommercialPageData(projectId);

  if (result.status === "reauth") {
    redirect(result.signInPath);
  }

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "error") {
    return (
      <div className="page-stack">
        <h1>Proposal &amp; Pricing unavailable</h1>
        <p className="form-error">{result.message}</p>
        <Link href={`/portal/projects/${encodeURIComponent(projectId)}`}>
          Back to project
        </Link>
      </div>
    );
  }

  return (
    <CommercialProposalPanel
      projectId={projectId}
      initialSnapshot={result.snapshot}
    />
  );
}
