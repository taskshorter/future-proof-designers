"use client";

import Link from "next/link";

import type { DepositPaymentStatusProjection } from "@/lib/factory/contract";

type DepositCancelClientProps = {
  projectId: string;
  payment: DepositPaymentStatusProjection;
};

export function DepositCancelClient({
  projectId,
  payment,
}: DepositCancelClientProps) {
  const commercialHref = `/portal/projects/${encodeURIComponent(projectId)}/commercial`;

  return (
    <div className="page-stack">
      <h1>Payment status</h1>
      <div aria-live="polite">
        <CancelCopy state={payment.paymentState} />
      </div>
      <div className="button-row">
        <Link className="button-link" href={commercialHref}>
          Back to Proposal &amp; Pricing
        </Link>
      </div>
    </div>
  );
}

function CancelCopy({
  state,
}: {
  state: DepositPaymentStatusProjection["paymentState"];
}) {
  switch (state) {
    case "READY_TO_PAY":
    case "FAILED_RETRYABLE":
      return <p>Payment wasn’t completed. You can try again.</p>;
    case "PAYMENT_IN_PROGRESS":
      return (
        <p>
          Your payment is still being processed securely. You don’t need to pay
          again.
        </p>
      );
    case "CONFIRMING":
      return (
        <>
          <p>
            <strong>We’re confirming your payment.</strong>
          </p>
          <p>
            Your payment was submitted. You don’t need to pay again while we
            confirm it.
          </p>
        </>
      );
    case "PAID":
      return (
        <>
          <p>
            <strong>Deposit received.</strong>
          </p>
          <p>Your project is moving into production.</p>
        </>
      );
    case "ACTION_REQUIRED":
      return (
        <>
          <p>
            <strong>We’re reviewing your payment.</strong>
          </p>
          <p>Please don’t submit another payment while we review it.</p>
        </>
      );
    case "NOT_AVAILABLE":
    default:
      return (
        <p>
          We’re checking your payment status. You can return to Proposal &amp;
          Pricing anytime.
        </p>
      );
  }
}
