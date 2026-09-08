import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DepositCancelClient } from "@/components/payment/DepositCancelClient";
import { loadDepositPaymentForReturn } from "@/lib/payment/actions";

export const metadata: Metadata = {
  title: "Payment status",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ attempt?: string }>;
};

/**
 * Stripe cancel return — checks Factory state; never blindly claims cancellation.
 */
export default async function DepositCancelPage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  void (await searchParams).attempt;

  const result = await loadDepositPaymentForReturn(projectId, "cancel");

  if (result.status === "reauth") {
    redirect(result.signInPath);
  }

  if (result.status === "error") {
    return (
      <div className="page-stack">
        <h1>Payment status</h1>
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
    <DepositCancelClient projectId={projectId} payment={result.payment} />
  );
}
