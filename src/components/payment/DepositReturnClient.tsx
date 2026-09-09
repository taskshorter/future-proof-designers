"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { DepositPaymentStatusProjection } from "@/lib/factory/contract";
import { loadDepositPaymentStatusAction } from "@/lib/payment/actions";

export const DEPOSIT_RETURN_POLL_INTERVAL_MS = 2_000;
export const DEPOSIT_RETURN_POLL_MAX_MS = 30_000;
export const DEPOSIT_RETURN_POLL_INTERVAL_SECONDS =
  DEPOSIT_RETURN_POLL_INTERVAL_MS / 1000;
export const DEPOSIT_RETURN_POLL_MAX_SECONDS = DEPOSIT_RETURN_POLL_MAX_MS / 1000;

const CONTINUE_POLL = new Set(["PAYMENT_IN_PROGRESS", "CONFIRMING"]);

type DepositReturnClientProps = {
  projectId: string;
  initialPayment: DepositPaymentStatusProjection;
  /** Test-only overrides for bounded polling. */
  pollIntervalMs?: number;
  pollMaxMs?: number;
};

export function DepositReturnClient({
  projectId,
  initialPayment,
  pollIntervalMs = DEPOSIT_RETURN_POLL_INTERVAL_MS,
  pollMaxMs = DEPOSIT_RETURN_POLL_MAX_MS,
}: DepositReturnClientProps) {
  const [payment, setPayment] = useState(initialPayment);
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!CONTINUE_POLL.has(payment.paymentState)) {
      return;
    }

    if (startedAt.current == null) {
      startedAt.current = Date.now();
    }

    timerRef.current = setInterval(() => {
      void (async () => {
        const start = startedAt.current ?? Date.now();
        if (Date.now() - start >= pollMaxMs) {
          setTimedOut(true);
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return;
        }
        const result = await loadDepositPaymentStatusAction(projectId);
        if (result.status !== "success") return;
        setPayment(result.payment);
        if (!CONTINUE_POLL.has(result.payment.paymentState)) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
        }
      })();
    }, pollIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [projectId, payment.paymentState, pollIntervalMs, pollMaxMs]);

  const commercialHref = `/portal/projects/${encodeURIComponent(projectId)}/commercial`;

  return (
    <div className="page-stack">
      <h1>Payment confirmation</h1>
      <div aria-live="polite">
        <ReturnCopy state={payment.paymentState} timedOut={timedOut} />
      </div>
      <div className="button-row">
        <Link className="button-link" href={commercialHref}>
          Back to Proposal &amp; Pricing
        </Link>
      </div>
    </div>
  );
}

function ReturnCopy({
  state,
  timedOut,
}: {
  state: DepositPaymentStatusProjection["paymentState"];
  timedOut: boolean;
}) {
  if (timedOut && CONTINUE_POLL.has(state)) {
    return (
      <p>
        We’re still confirming your payment. You can safely leave this page and
        check Proposal &amp; Pricing again later.
      </p>
    );
  }

  switch (state) {
    case "CONFIRMING":
      return (
        <>
          <p>
            <strong>We’re confirming your payment.</strong>
          </p>
          <p>
            Your payment was submitted successfully. We’re waiting for secure
            confirmation from our payment provider. You don’t need to pay again.
          </p>
        </>
      );
    case "PAYMENT_IN_PROGRESS":
      return (
        <p>
          Your payment is still being processed securely. You don’t need to pay
          again.
        </p>
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
    case "FAILED_RETRYABLE":
    case "READY_TO_PAY":
      return (
        <p>
          Payment wasn’t completed. You can try again from Proposal &amp;
          Pricing.
        </p>
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
