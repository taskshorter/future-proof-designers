"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import {
  reapproveCommercialOfferAction,
  reloadCommercialSnapshotAction,
  respondCommercialNeedInfoAction,
  type CommercialSnapshot,
} from "@/lib/commercial/actions";
import {
  DECLINE_NEUTRAL_MESSAGE,
  DEPOSIT_READY_PAYMENT_NOTE,
  quoteLineAmountSuffix,
} from "@/lib/commercial/labels";
import { formatMinorUnitsOrFallback } from "@/lib/commercial/money";
import type { QuoteProjection, WebsitePlanProjection } from "@/lib/factory/contract";
import {
  moduleInclusionLabel,
  moduleKeyLabel,
  packageCategoryLabel,
  packageRationaleMessage,
  requiredFunctionalityLabels,
} from "@/lib/website-plan/labels";

type StatusTone = "muted" | "success" | "error" | "conflict";

type CommercialProposalPanelProps = {
  projectId: string;
  initialSnapshot: CommercialSnapshot;
};

type ReapproveIntent = {
  offerVersionId: string;
  expectedOfferVersion: number;
  operationId: string;
  correlationId: string;
};

type NeedInfoIntent = {
  blockerId: string;
  expectedBlockerVersion: number;
  responseFingerprint: string;
  operationId: string;
  correlationId: string;
};

function canonicalizeNeedInfoResponse(text: string): string {
  // Match Factory: trim only. Do not collapse internal whitespace.
  return text.trim();
}

function ScopeSummary({
  plan,
  projectId,
}: {
  plan: WebsitePlanProjection;
  projectId: string;
}) {
  return (
    <section className="panel">
      <h2>Current website scope</h2>
      <dl className="review-list">
        <div>
          <dt>Package</dt>
          <dd>{packageCategoryLabel(plan.packageCategory)}</dd>
        </div>
        <div>
          <dt>Why this package</dt>
          <dd>
            {packageRationaleMessage(plan.packageCategory, plan.packageRationale)}
          </dd>
        </div>
        <div>
          <dt>Pages</dt>
          <dd>
            {plan.pages.length === 0
              ? "—"
              : plan.pages.map((page) => page.title).join(", ")}
          </dd>
        </div>
        <div>
          <dt>Required functionality</dt>
          <dd>
            {requiredFunctionalityLabels(plan.requiredFunctionality).join(", ") ||
              "—"}
          </dd>
        </div>
        {plan.modules.length > 0 ? (
          <div>
            <dt>Modules</dt>
            <dd>
              {plan.modules
                .map(
                  (module) =>
                    `${moduleKeyLabel(module.moduleKey)} (${moduleInclusionLabel(module.inclusion)})`,
                )
                .join(", ")}
            </dd>
          </div>
        ) : null}
        {plan.customRequirements.length > 0 ? (
          <div>
            <dt>Custom requirements</dt>
            <dd>{plan.customRequirements.join("; ")}</dd>
          </div>
        ) : null}
      </dl>
      <div className="button-row">
        <Link
          className="button-link secondary"
          href={`/portal/projects/${encodeURIComponent(projectId)}/plan`}
        >
          View full Website Plan
        </Link>
      </div>
    </section>
  );
}

function PricingSection({ quote }: { quote: QuoteProjection }) {
  return (
    <section className="panel">
      <h2>Pricing</h2>
      {quote.customerRationale ? <p>{quote.customerRationale}</p> : null}
      <ul className="website-plan-list">
        {quote.lines.map((line, index) => (
          <li key={`${line.kind}-${line.label}-${index}`} className="website-plan-item">
            <span>{line.label}</span>
            <strong>
              {formatMinorUnitsOrFallback(line.minorUnits, quote.currency)}
              {quoteLineAmountSuffix(line)}
            </strong>
          </li>
        ))}
      </ul>
      <dl className="review-list">
        <div>
          <dt>One-time total</dt>
          <dd>
            {formatMinorUnitsOrFallback(quote.oneTimeTotalMinor, quote.currency)}
          </dd>
        </div>
        {quote.recurringMonthlyMinor > 0 ? (
          <div>
            <dt>Monthly recurring</dt>
            <dd>
              {formatMinorUnitsOrFallback(
                quote.recurringMonthlyMinor,
                quote.currency,
              )}
              {" / month"}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Deposit</dt>
          <dd>
            {formatMinorUnitsOrFallback(quote.depositMinor, quote.currency)}
          </dd>
        </div>
        <div>
          <dt>Remaining</dt>
          <dd>
            {formatMinorUnitsOrFallback(quote.remainingMinor, quote.currency)}
          </dd>
        </div>
      </dl>
      {quote.taxStatement ? <p className="muted">{quote.taxStatement}</p> : null}
    </section>
  );
}

export function CommercialProposalPanel({
  projectId,
  initialSnapshot,
}: CommercialProposalPanelProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>("muted");
  const [conflictLocked, setConflictLocked] = useState(false);
  const [needInfoText, setNeedInfoText] = useState("");
  const [isPending, startTransition] = useTransition();
  const reapproveIntentRef = useRef<ReapproveIntent | null>(null);
  const needInfoIntentRef = useRef<NeedInfoIntent | null>(null);

  const setFeedback = (message: string, tone: StatusTone) => {
    setStatusMessage(message);
    setStatusTone(tone);
  };

  const projectName = snapshot.resume.project.projectName;
  const plan = snapshot.plan;
  const quote = snapshot.quote;
  const offer = snapshot.offer;
  const mutationsLocked = conflictLocked || snapshot.versionMismatch || isPending;

  const showPlanReconfirm =
    snapshot.quoteReason === "PLAN_RECONFIRM_REQUIRED" ||
    snapshot.offerReason === "PLAN_RECONFIRM_REQUIRED";

  const showDecline =
    !showPlanReconfirm &&
    (snapshot.decline != null || offer?.status === "DECLINED");

  const showNeedInfo =
    !showPlanReconfirm && !showDecline && snapshot.needInfo != null;

  const showConsultation =
    !showPlanReconfirm &&
    !showDecline &&
    snapshot.consultationRequired &&
    !showNeedInfo;

  const showReapproval =
    !showPlanReconfirm &&
    !showDecline &&
    !showNeedInfo &&
    !snapshot.versionMismatch &&
    offer?.status === "AWAITING_CUSTOMER_REAPPROVAL";

  const showDepositReady =
    !showPlanReconfirm &&
    !showDecline &&
    !showNeedInfo &&
    (offer?.depositReady === true || offer?.status === "DEPOSIT_READY");

  const showOwnerApproved =
    !showPlanReconfirm &&
    !showDecline &&
    !showNeedInfo &&
    !showDepositReady &&
    offer?.status === "OWNER_APPROVED";

  const showAwaitingOwner =
    !showPlanReconfirm &&
    !showDecline &&
    !showNeedInfo &&
    !showDepositReady &&
    !showOwnerApproved &&
    !showReapproval &&
    offer?.status === "AWAITING_OWNER";

  const showCustomAwaitingTerms =
    !showPlanReconfirm &&
    !showDecline &&
    !offer &&
    (snapshot.offerReason === "CUSTOM_AWAITING_OWNER_TERMS" ||
      snapshot.quoteReason === "CUSTOM_AWAITING_OWNER_TERMS");

  const showNotYetAvailable =
    !showPlanReconfirm &&
    !showDecline &&
    !offer &&
    !showCustomAwaitingTerms &&
    (snapshot.offerReason === "NOT_YET_AVAILABLE" ||
      snapshot.quoteReason === "NOT_YET_AVAILABLE" ||
      (!quote && !offer));

  const showPricing = !showPlanReconfirm && quote != null;

  const handleReload = () => {
    startTransition(async () => {
      const previousNeedInfo = snapshot.needInfo;
      const result = await reloadCommercialSnapshotAction(projectId);
      if (!result.ok) {
        if (result.signInPath) {
          router.push(result.signInPath);
          return;
        }
        setFeedback(result.message, "error");
        return;
      }
      reapproveIntentRef.current = null;
      needInfoIntentRef.current = null;
      setConflictLocked(false);

      const nextNeedInfo = result.snapshot.needInfo;
      const blockerChanged =
        !previousNeedInfo ||
        !nextNeedInfo ||
        previousNeedInfo.blockerId !== nextNeedInfo.blockerId ||
        previousNeedInfo.version !== nextNeedInfo.version;
      if (blockerChanged) {
        setNeedInfoText("");
      }

      setSnapshot(result.snapshot);
      setFeedback("Loaded the latest proposal.", "success");
    });
  };

  const handleReapprove = () => {
    if (!offer || mutationsLocked || offer.status !== "AWAITING_CUSTOMER_REAPPROVAL") {
      return;
    }

    let intent = reapproveIntentRef.current;
    if (
      !intent ||
      intent.offerVersionId !== offer.offerVersionId ||
      intent.expectedOfferVersion !== offer.offerVersion
    ) {
      intent = {
        offerVersionId: offer.offerVersionId,
        expectedOfferVersion: offer.offerVersion,
        operationId: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
      };
      reapproveIntentRef.current = intent;
    }

    startTransition(async () => {
      const result = await reapproveCommercialOfferAction(projectId, intent!);
      if (!result.ok) {
        if (result.signInPath) {
          router.push(result.signInPath);
          return;
        }
        if (result.category === "stale_or_conflicting") {
          setConflictLocked(true);
          setFeedback(
            "This proposal changed elsewhere. Reload the latest proposal before continuing.",
            "conflict",
          );
          return;
        }
        if (result.category === "temporary_failure") {
          setFeedback(result.message, "error");
          return;
        }
        reapproveIntentRef.current = null;
        setFeedback(result.message, "error");
        return;
      }
      reapproveIntentRef.current = null;
      setSnapshot(result.snapshot);
      setFeedback("Revised proposal approved.", "success");
    });
  };

  const handleNeedInfoSubmit = () => {
    const needInfo = snapshot.needInfo;
    if (!needInfo || mutationsLocked) return;
    const normalizedResponse = canonicalizeNeedInfoResponse(needInfoText);
    if (normalizedResponse.length < 1 || normalizedResponse.length > 4000) {
      setFeedback("Enter a response between 1 and 4000 characters.", "error");
      return;
    }

    let intent = needInfoIntentRef.current;
    if (
      !intent ||
      intent.blockerId !== needInfo.blockerId ||
      intent.expectedBlockerVersion !== needInfo.version ||
      intent.responseFingerprint !== normalizedResponse
    ) {
      intent = {
        blockerId: needInfo.blockerId,
        expectedBlockerVersion: needInfo.version,
        responseFingerprint: normalizedResponse,
        operationId: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
      };
      needInfoIntentRef.current = intent;
    }

    startTransition(async () => {
      const result = await respondCommercialNeedInfoAction(projectId, {
        blockerId: intent!.blockerId,
        operationId: intent!.operationId,
        correlationId: intent!.correlationId,
        expectedBlockerVersion: intent!.expectedBlockerVersion,
        responseText: normalizedResponse,
      });
      if (!result.ok) {
        if (result.signInPath) {
          router.push(result.signInPath);
          return;
        }
        if (result.category === "stale_or_conflicting") {
          setConflictLocked(true);
          setFeedback(
            "This proposal changed elsewhere. Reload the latest proposal before continuing.",
            "conflict",
          );
          return;
        }
        if (result.category === "temporary_failure") {
          setFeedback(result.message, "error");
          return;
        }
        needInfoIntentRef.current = null;
        setFeedback(result.message, "error");
        return;
      }
      needInfoIntentRef.current = null;
      setNeedInfoText("");
      setSnapshot(result.snapshot);
      setFeedback("Thanks — your response was saved.", "success");
    });
  };

  return (
    <div className="page-stack">
      <header>
        <h1>Proposal &amp; Pricing</h1>
        <p className="muted">{projectName}</p>
      </header>

      {snapshot.versionMismatch ? (
        <section className="panel form-error" role="alert">
          <p>
            The current proposal details do not line up. Reload the latest proposal
            before continuing.
          </p>
          <button type="button" onClick={handleReload} disabled={isPending}>
            Reload latest proposal
          </button>
        </section>
      ) : null}

      {conflictLocked ? (
        <section className="panel form-error" role="alert">
          <p>
            This proposal changed elsewhere. Reload the latest proposal before
            continuing.
          </p>
          <button type="button" onClick={handleReload} disabled={isPending}>
            Reload latest proposal
          </button>
        </section>
      ) : null}

      {statusMessage ? (
        <p
          className={
            statusTone === "success"
              ? "form-success"
              : statusTone === "error" || statusTone === "conflict"
                ? "form-error"
                : "muted"
          }
          aria-live="polite"
        >
          {statusMessage}
        </p>
      ) : null}

      {showPlanReconfirm ? (
        <section className="panel">
          <h2>Your Website Plan changed</h2>
          <p>
            Previous pricing no longer applies. Review and confirm the latest
            Website Plan before new pricing can continue.
          </p>
          <div className="button-row">
            <Link
              className="button-link"
              href={`/portal/projects/${encodeURIComponent(projectId)}/plan`}
            >
              Review Website Plan
            </Link>
          </div>
        </section>
      ) : null}

      {!showPlanReconfirm && plan ? (
        <ScopeSummary plan={plan} projectId={projectId} />
      ) : null}

      {showDecline ? (
        <section className="panel">
          <h2>Proposal not moving forward</h2>
          <p>
            {snapshot.decline?.customerSafeExplanation?.trim() ||
              DECLINE_NEUTRAL_MESSAGE}
          </p>
        </section>
      ) : null}

      {showNeedInfo && snapshot.needInfo ? (
        <section className="panel">
          <h2>We need a little more information</h2>
          <p>{snapshot.needInfo.customerVisibleQuestion}</p>
          <label htmlFor="commercial-need-info-response">
            <span>Your response</span>
            <textarea
              id="commercial-need-info-response"
              rows={5}
              maxLength={4000}
              value={needInfoText}
              disabled={mutationsLocked}
              onChange={(event) => setNeedInfoText(event.target.value)}
            />
          </label>
          <div className="button-row">
            <button
              type="button"
              disabled={mutationsLocked || needInfoText.trim().length === 0}
              aria-busy={isPending}
              onClick={handleNeedInfoSubmit}
            >
              {isPending ? "Sending…" : "Send response"}
            </button>
          </div>
          {snapshot.consultationRequired ? (
            <p className="muted">
              A consultation may also be needed. The Future Proof team will
              coordinate the next discussion.
            </p>
          ) : null}
        </section>
      ) : null}

      {showConsultation ? (
        <section className="panel">
          <h2>A consultation is needed</h2>
          <p>
            The Future Proof team will coordinate the next discussion about your
            project.
          </p>
        </section>
      ) : null}

      {showReapproval && offer ? (
        <section className="panel">
          <h2>This proposal was updated</h2>
          <p>
            Future Proof changed the customer-facing website scope and/or pricing.
            Please review the current proposal below and approve the revised
            website scope and pricing currently shown.
          </p>
          <div className="button-row">
            <button
              type="button"
              disabled={mutationsLocked}
              aria-busy={isPending}
              onClick={handleReapprove}
            >
              {isPending ? "Approving…" : "Approve revised proposal"}
            </button>
          </div>
        </section>
      ) : null}

      {showDepositReady ? (
        <section className="panel">
          <h2>Your project is approved and ready to start</h2>
          <p>{DEPOSIT_READY_PAYMENT_NOTE}</p>
        </section>
      ) : null}

      {showOwnerApproved ? (
        <section className="panel">
          <h2>Your proposal has been approved</h2>
          <p>
            The Future Proof team is finalizing the next required step. No action
            is needed from you right now.
          </p>
        </section>
      ) : null}

      {showAwaitingOwner ? (
        <section className="panel">
          <h2>Your proposal is being reviewed</h2>
          <p>
            Pricing and scope are with the Future Proof team for final commercial
            review.
          </p>
        </section>
      ) : null}

      {showCustomAwaitingTerms ? (
        <section className="panel">
          <h2>Your project needs custom pricing</h2>
          <p>
            Your confirmed Website Plan is being reviewed so custom pricing can be
            prepared.
          </p>
          {snapshot.consultationRequired ? (
            <p className="muted">
              A consultation may also be needed. The Future Proof team will
              coordinate the next discussion.
            </p>
          ) : null}
        </section>
      ) : null}

      {showNotYetAvailable ? (
        <section className="panel">
          <h2>We’re preparing your proposal and pricing</h2>
          <p>This is still in progress and is not an error.</p>
        </section>
      ) : null}

      {showPricing && quote ? <PricingSection quote={quote} /> : null}

      <div className="button-row">
        <Link
          className="button-link secondary"
          href={`/portal/projects/${encodeURIComponent(projectId)}`}
        >
          Back to project
        </Link>
        <Link className="button-link secondary" href="/portal">
          Back to portal
        </Link>
      </div>
    </div>
  );
}
