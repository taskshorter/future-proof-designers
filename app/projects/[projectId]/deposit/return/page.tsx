import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DepositReturnClient } from "@/components/payment/DepositReturnClient";
import { loadDepositPaymentForReturn } from "@/lib/payment/actions";

export const metadata: Metadata = {
  title: "Payment confirmation",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ attempt?: string }>;
};

/**
 * Stripe success return — NON-AUTHORITATIVE.
 * Query `attempt` is ignored for payment authority; Factory GET is the only source.
 */
export default async function DepositReturnPage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  // Parse attempt for harmless correlation only — never grant authority.
  void (await searchParams).attempt;

  const result = await loadDepositPaymentForReturn(projectId, "return");

  if (result.status === "reauth") {
    redirect(result.signInPath);
  }

  if (result.status === "error") {
    return (
      <div className="page-stack">
        <h1>Payment confirmation</h1>
        <p className="form-error">{result.message}</p>
        <Link
          href={`/portal/projects/${encodeURIComponent(projectId)}/commercial`}
        >
          Back to Proposal &amp; Pricing
        </Link>
      </div>
    );
  }

  return (
    <DepositReturnClient projectId={projectId} initialPayment={result.payment} />
  );
}
