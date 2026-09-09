"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { formatMinorUnitsOrFallback } from "@/lib/commercial/money";
import type { DepositPaymentStatusProjection } from "@/lib/factory/contract";
import {
  initiateDepositCheckoutAction,
  loadDepositPaymentStatusAction,
} from "@/lib/payment/actions";

type CheckoutIntent = {
  operationId: string;
  correlationId: string;
};

type DepositPaymentPanelProps = {
  projectId: string;
};

const POLL_STATES = new Set(["PAYMENT_IN_PROGRESS", "CONFIRMING"]);

function StatusLive({ children }: { children: React.ReactNode }) {
  return (
    <p className="muted" aria-live="polite">
      {children}
    </p>
  );
}

export function DepositPaymentPanel({ projectId }: DepositPaymentPanelProps) {
  const router = useRouter();
  const [payment, setPayment] = useState<DepositPaymentStatusProjection | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const intentRef = useRef<CheckoutIntent | null>(null);
  const redirectedRef = useRef(false);

  const refresh = () => {
    startTransition(async () => {
      const result = await loadDepositPaymentStatusAction(projectId);
      if (result.status === "reauth") {
        router.push(result.signInPath);
        return;
      }
      if (result.status === "error") {
        setLoadError(result.message);
        return;
      }
      setLoadError(null);
      setPayment(result.payment);
    });
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only load
  }, [projectId]);

  const startCheckout = () => {
    if (redirectedRef.current || isPending) return;

    if (!intentRef.current) {
      intentRef.current = {
        operationId: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
      };
    }
    const intent = intentRef.current;
    setActionError(null);

    startTransition(async () => {
      const result = await initiateDepositCheckoutAction(
        projectId,
        intent.operationId,
        intent.correlationId,
      );
      if (!result.ok) {
        if (result.signInPath) {
          router.push(result.signInPath);
          return;
        }
        // Temporary failures keep the same intent for retry.
        if (result.category !== "temporary_failure") {
          intentRef.current = null;
          // Refresh projection after terminal / non-temp failures.
          refresh();
        }
        setActionError(result.message);
        return;
      }
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      intentRef.current = null;
      window.location.assign(result.checkout.checkoutUrl);
    });
  };

  return (
    <section className="panel" aria-labelledby="deposit-payment-heading">
      <h2 id="deposit-payment-heading">Production deposit</h2>

      {loadError && !payment ? (
        <div>
          <p className="form-error" role="alert">
            {loadError}
          </p>
          <p className="muted">
            Proposal details above remain available. You can retry loading payment
            status.
          </p>
          <div className="button-row">
            <button type="button" onClick={refresh} disabled={isPending} aria-busy={isPending}>
              {isPending ? "Refreshing…" : "Retry payment status"}
            </button>
          </div>
        </div>
      ) : null}

      {payment ? (
        <DepositPaymentBody
          payment={payment}
          isPending={isPending}
          actionError={actionError}
          onPay={startCheckout}
          onRefresh={refresh}
        />
      ) : !loadError ? (
        <StatusLive>Loading payment status…</StatusLive>
      ) : null}
    </section>
  );
}

function DepositPaymentBody({
  payment,
  isPending,
  actionError,
  onPay,
  onRefresh,
}: {
  payment: DepositPaymentStatusProjection;
  isPending: boolean;
  actionError: string | null;
  onPay: () => void;
  onRefresh: () => void;
}) {
  const { paymentState, paymentAvailable, amountDueMinor, currency, taxMinor } =
    payment;

  const amountText =
    amountDueMinor != null && currency
      ? formatMinorUnitsOrFallback(amountDueMinor, currency)
      : null;

  const taxText =
    taxMinor != null && currency
      ? formatMinorUnitsOrFallback(taxMinor, currency)
      : null;

  return (
    <div>
      {amountText ? (
        <dl className="review-list">
          <div>
            <dt>Production deposit</dt>
            <dd>{amountText}</dd>
          </div>
          {taxText ? (
            <div>
              <dt>Estimated tax</dt>
              <dd>{taxText}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {taxMinor == null &&
      (paymentState === "READY_TO_PAY" ||
        paymentState === "PAYMENT_IN_PROGRESS" ||
        paymentState === "FAILED_RETRYABLE") ? (
        <p className="muted">
          Applicable tax will be calculated securely at checkout.
        </p>
      ) : null}

      <div aria-live="polite">
        {paymentState === "NOT_AVAILABLE" ? (
          <StatusLive>
            Payment is not available for this project yet.
          </StatusLive>
        ) : null}

        {paymentState === "READY_TO_PAY" ? (
          <StatusLive>
            Your project is ready for the production deposit.
          </StatusLive>
        ) : null}

        {paymentState === "PAYMENT_IN_PROGRESS" ? (
          <StatusLive>
            Secure checkout has already been started for this deposit.
          </StatusLive>
        ) : null}

        {paymentState === "CONFIRMING" ? (
          <>
            <p>
              <strong>We’re confirming your payment.</strong>
            </p>
            <StatusLive>
              Your payment was submitted. You don’t need to pay again while we
              confirm it.
            </StatusLive>
          </>
        ) : null}

        {paymentState === "PAID" ? (
          <>
            <p>
              <strong>Deposit received.</strong>
            </p>
            <StatusLive>Your project is moving into production.</StatusLive>
          </>
        ) : null}

        {paymentState === "FAILED_RETRYABLE" ? (
          <StatusLive>
            Payment did not complete. You can try again when available.
          </StatusLive>
        ) : null}

        {paymentState === "ACTION_REQUIRED" ? (
          <>
            <p>
              <strong>We’re reviewing your payment.</strong>
            </p>
            <StatusLive>
              Please don’t submit another payment while we review it.
            </StatusLive>
          </>
        ) : null}
      </div>

      {actionError ? (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="button-row">
        {(paymentState === "READY_TO_PAY" ||
          paymentState === "FAILED_RETRYABLE") &&
        paymentAvailable ? (
          <button
            type="button"
            disabled={isPending}
            aria-busy={isPending}
            onClick={onPay}
          >
            {isPending ? "Starting secure checkout…" : "Pay production deposit"}
          </button>
        ) : null}

        {paymentState === "PAYMENT_IN_PROGRESS" && paymentAvailable ? (
          <button
            type="button"
            disabled={isPending}
            aria-busy={isPending}
            onClick={onPay}
          >
            {isPending ? "Continuing…" : "Continue to secure checkout"}
          </button>
        ) : null}

        {POLL_STATES.has(paymentState) || paymentState === "ACTION_REQUIRED" ? (
          <button
            type="button"
            className="secondary"
            disabled={isPending}
            aria-busy={isPending}
            onClick={onRefresh}
          >
            Refresh status
          </button>
        ) : null}
      </div>
    </div>
  );
}
