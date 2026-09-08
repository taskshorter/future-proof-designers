"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";

import type {
  WebsitePlanProjection,
  WebsitePlanRevision,
} from "@/lib/factory/contract";
import {
  assembleWebsitePlanAction,
  confirmWebsitePlanAction,
  reloadWebsitePlanAction,
  reviseWebsitePlanAction,
} from "@/lib/website-plan/actions";
import {
  assemblyStatusLabel,
  customerAttentionMessages,
  moduleInclusionLabel,
  moduleKeyLabel,
  packageCategoryLabel,
  packageRationaleMessage,
  pageOriginLabel,
  requiredFunctionalityLabels,
} from "@/lib/website-plan/labels";
import { fingerprintWebsitePlanRevision } from "@/lib/website-plan/revision-fingerprint";

type WebsitePlanPanelProps = {
  projectId: string;
  projectName: string;
  initialPlan: WebsitePlanProjection | null;
};

type StatusTone = "muted" | "success" | "error" | "conflict";

function newId(): string {
  return crypto.randomUUID();
}

function isPlanIncomplete(plan: WebsitePlanProjection): boolean {
  return plan.assemblyStatus === "INCOMPLETE" || plan.packageCategory === null;
}

export function WebsitePlanPanel({
  projectId,
  projectName,
  initialPlan,
}: WebsitePlanPanelProps) {
  const [plan, setPlan] = useState<WebsitePlanProjection | null>(initialPlan);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<StatusTone>("muted");
  const [editing, setEditing] = useState(false);
  const [conflictLocked, setConflictLocked] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [customDraft, setCustomDraft] = useState("");
  const [pendingEditPageKey, setPendingEditPageKey] = useState<string | null>(
    null,
  );
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [pendingCustomIndex, setPendingCustomIndex] = useState<number | null>(
    null,
  );
  const [customEditDraft, setCustomEditDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  const assembleIntentRef = useRef<{
    operationId: string;
    correlationId: string;
  } | null>(null);
  const confirmIntentRef = useRef<{
    operationId: string;
    correlationId: string;
    planVersionId: string;
    expectedPlanVersion: number;
  } | null>(null);
  const revisionIntentRef = useRef<{
    operationId: string;
    correlationId: string;
    expectedPlanVersion: number;
    revisionFingerprint: string;
    revision: WebsitePlanRevision;
  } | null>(null);

  const mutationsLocked = conflictLocked || isPending;

  const setFeedback = useCallback((message: string, tone: StatusTone) => {
    setStatusMessage(message);
    setStatusTone(tone);
  }, []);

  const handleReload = useCallback(() => {
    startTransition(async () => {
      const result = await reloadWebsitePlanAction(projectId);
      if (!result.ok) {
        if (result.signInPath) {
          window.location.assign(result.signInPath);
          return;
        }
        setFeedback(result.message, "error");
        return;
      }
      setPlan(result.plan);
      setEditing(false);
      setConflictLocked(false);
      setPendingEditPageKey(null);
      setPendingCustomIndex(null);
      setCustomEditDraft("");
      setFeedback("Loaded the latest Website Plan.", "success");
      assembleIntentRef.current = null;
      confirmIntentRef.current = null;
      revisionIntentRef.current = null;
    });
  }, [projectId, setFeedback]);

  const handleAssemble = useCallback(() => {
    if (!assembleIntentRef.current) {
      assembleIntentRef.current = {
        operationId: newId(),
        correlationId: newId(),
      };
    }
    const intent = assembleIntentRef.current;
    startTransition(async () => {
      const result = await assembleWebsitePlanAction(projectId, intent);
      if (!result.ok) {
        if (result.signInPath) {
          window.location.assign(result.signInPath);
          return;
        }
        if (result.category === "temporary_failure") {
          setFeedback(result.message, "error");
          return;
        }
        assembleIntentRef.current = null;
        setFeedback(result.message, "error");
        return;
      }
      assembleIntentRef.current = null;
      setPlan(result.plan);
      setFeedback(
        result.replayed
          ? "Website Plan already prepared."
          : "Website Plan prepared.",
        "success",
      );
    });
  }, [projectId, setFeedback]);

  const submitRevision = useCallback(
    (revision: WebsitePlanRevision, successMessage: string) => {
      if (!plan || conflictLocked) return;

      const fingerprint = fingerprintWebsitePlanRevision(revision);
      const existing = revisionIntentRef.current;
      if (
        !existing ||
        existing.expectedPlanVersion !== plan.planVersion ||
        existing.revisionFingerprint !== fingerprint
      ) {
        revisionIntentRef.current = {
          operationId: newId(),
          correlationId: newId(),
          expectedPlanVersion: plan.planVersion,
          revisionFingerprint: fingerprint,
          revision,
        };
      } else {
        revisionIntentRef.current = {
          ...existing,
          revision,
        };
      }

      const intent = revisionIntentRef.current;
      startTransition(async () => {
        const result = await reviseWebsitePlanAction(projectId, {
          operationId: intent.operationId,
          correlationId: intent.correlationId,
          expectedPlanVersion: intent.expectedPlanVersion,
          revision: intent.revision,
        });
        if (!result.ok) {
          if (result.signInPath) {
            window.location.assign(result.signInPath);
            return;
          }
          if (result.category === "stale_or_conflicting") {
            setConflictLocked(true);
            setFeedback(
              "This Website Plan was updated elsewhere. Reload the latest Plan before continuing.",
              "conflict",
            );
            return;
          }
          if (result.category === "temporary_failure") {
            setFeedback(result.message, "error");
            return;
          }
          revisionIntentRef.current = null;
          setFeedback(result.message, "error");
          return;
        }
        revisionIntentRef.current = null;
        setPlan(result.plan);
        setAddTitle("");
        setAddNotes("");
        setCustomDraft("");
        setPendingEditPageKey(null);
        setEditTitle("");
        setEditNotes("");
        setPendingCustomIndex(null);
        setCustomEditDraft("");
        setEditing(true);
        setFeedback(successMessage, "success");
      });
    },
    [conflictLocked, plan, projectId, setFeedback],
  );

  const handleConfirm = useCallback(() => {
    if (!plan || isPlanIncomplete(plan) || plan.confirmed || conflictLocked) {
      return;
    }
    if (
      !confirmIntentRef.current ||
      confirmIntentRef.current.planVersionId !== plan.planVersionId ||
      confirmIntentRef.current.expectedPlanVersion !== plan.planVersion
    ) {
      confirmIntentRef.current = {
        operationId: newId(),
        correlationId: newId(),
        planVersionId: plan.planVersionId,
        expectedPlanVersion: plan.planVersion,
      };
    }
    const intent = confirmIntentRef.current;
    startTransition(async () => {
      const result = await confirmWebsitePlanAction(projectId, intent);
      if (!result.ok) {
        if (result.signInPath) {
          window.location.assign(result.signInPath);
          return;
        }
        if (result.category === "stale_or_conflicting") {
          setConflictLocked(true);
          setFeedback(
            "This Website Plan was updated elsewhere. Reload the latest Plan before confirming.",
            "conflict",
          );
          return;
        }
        if (result.category === "temporary_failure") {
          setFeedback(result.message, "error");
          return;
        }
        confirmIntentRef.current = null;
        setFeedback(result.message, "error");
        return;
      }
      confirmIntentRef.current = null;
      setPlan(result.plan);
      setEditing(false);
      const hasCommercialProjections =
        result.quote != null || result.offer != null;
      if (hasCommercialProjections) {
        setFeedback(
          "Your Website Plan is confirmed. Your proposal and pricing are ready and are being reviewed by our team.",
          "success",
        );
      } else if (result.plan.packageCategory === "CUSTOM") {
        setFeedback(
          "Your Website Plan is confirmed. This project needs custom commercial terms, so our team will review the scope before pricing is available.",
          "success",
        );
      } else {
        setFeedback(
          "Your Website Plan is confirmed. We’re preparing the next pricing and review step.",
          "success",
        );
      }
    });
  }, [conflictLocked, plan, projectId, setFeedback]);

  if (!plan) {
    return (
      <div className="page-stack">
        <h1>Website Plan</h1>
        <p className="muted">{projectName}</p>
        <section className="panel">
          <h2>Your Website Plan hasn’t been prepared yet.</h2>
          <p>
            When you’re ready, prepare a Website Plan from your saved project
            information. Opening this page does not create a Plan automatically.
          </p>
          <div className="button-row">
            <button
              type="button"
              disabled={isPending}
              aria-busy={isPending}
              onClick={handleAssemble}
            >
              {isPending ? "Preparing…" : "Prepare Website Plan"}
            </button>
            <Link
              className="button-link secondary"
              href={`/portal/projects/${encodeURIComponent(projectId)}/onboarding`}
            >
              Continue onboarding
            </Link>
            <Link
              className="button-link secondary"
              href={`/portal/projects/${encodeURIComponent(projectId)}`}
            >
              Back to project
            </Link>
          </div>
        </section>
        {statusMessage ? (
          <p
            className={
              statusTone === "success"
                ? "form-success"
                : statusTone === "error" || statusTone === "conflict"
                  ? "form-error"
                  : "muted"
            }
            role={
              statusTone === "error" || statusTone === "conflict"
                ? "alert"
                : undefined
            }
            aria-live="polite"
          >
            {statusMessage}
          </p>
        ) : null}
      </div>
    );
  }

  const incomplete = isPlanIncomplete(plan);
  const showConfirm = !incomplete && !plan.confirmed && !editing && !conflictLocked;
  const showConfirmedBanner = plan.confirmed && !editing;
  const booklocal = plan.modules.find((module) => module.moduleKey === "booklocal");
  const attentionItems = customerAttentionMessages(
    plan.customerSafeAttention,
    plan.classificationAttention,
  );
  const functionalityLabels = requiredFunctionalityLabels(
    plan.requiredFunctionality,
  );

  return (
    <div className="page-stack">
      <h1>Website Plan</h1>
      <p className="muted">
        {projectName} · Plan version {plan.planVersion}
        {plan.confirmed && !editing ? " · Confirmed" : null}
      </p>

      {statusMessage ? (
        <p
          className={
            statusTone === "success"
              ? "form-success"
              : statusTone === "error" || statusTone === "conflict"
                ? "form-error"
                : "muted"
          }
          role={
            statusTone === "error" || statusTone === "conflict"
              ? "alert"
              : undefined
          }
          aria-live="polite"
        >
          {statusMessage}
          {statusTone === "conflict" || conflictLocked ? (
            <>
              {" "}
              <button
                type="button"
                className="secondary"
                disabled={isPending}
                onClick={handleReload}
              >
                Reload latest Plan
              </button>
            </>
          ) : null}
        </p>
      ) : null}

      {conflictLocked && statusTone !== "conflict" ? (
        <section className="panel">
          <h2>Reload required</h2>
          <p>
            This Website Plan was updated elsewhere. Reload the latest Plan
            before making more changes.
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={handleReload}
          >
            Reload latest Plan
          </button>
        </section>
      ) : null}

      {incomplete ? (
        <section className="panel">
          <h2>This Plan is not ready to confirm</h2>
          <p>
            You updated your onboarding information. Refresh this Website Plan
            to use the latest saved project details.
          </p>
          {attentionItems.length > 0 ? (
            <ul>
              {attentionItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <div className="button-row">
            <button
              type="button"
              disabled={mutationsLocked}
              aria-busy={isPending}
              onClick={() =>
                submitRevision({}, "Website Plan refreshed with latest details.")
              }
            >
              {isPending ? "Refreshing…" : "Refresh Website Plan"}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={mutationsLocked}
              onClick={() => setEditing(true)}
            >
              Edit Website Plan
            </button>
            <Link
              className="button-link secondary"
              href={`/portal/projects/${encodeURIComponent(projectId)}/onboarding`}
            >
              Continue onboarding
            </Link>
          </div>
        </section>
      ) : null}

      {showConfirmedBanner ? (
        <section className="panel">
          <h2>Website Plan confirmed</h2>
          <p>
            Your Website Plan is confirmed. View Proposal &amp; Pricing for the
            latest pricing and review status.
          </p>
          <div className="button-row">
            <Link
              className="button-link"
              href={`/portal/projects/${encodeURIComponent(projectId)}/commercial`}
            >
              View proposal &amp; pricing
            </Link>
            <button
              type="button"
              className="secondary"
              disabled={mutationsLocked}
              onClick={() => {
                setEditing(true);
                setFeedback(
                  "Editing creates a new Plan version that will need confirmation again.",
                  "muted",
                );
              }}
            >
              Request changes
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <h2>Recommended package</h2>
        <p>
          <strong>{packageCategoryLabel(plan.packageCategory)}</strong>
        </p>
        <p>
          {packageRationaleMessage(plan.packageCategory, plan.packageRationale)}
        </p>
        <p className="muted">{assemblyStatusLabel(plan.assemblyStatus)}</p>
      </section>

      <section className="panel">
        <h2>Business understanding</h2>
        <p>{plan.businessUnderstanding || "Not captured yet."}</p>
      </section>

      <section className="panel">
        <h2>Website goals</h2>
        {plan.websiteGoals.length > 0 ? (
          <ul>
            {plan.websiteGoals.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">No goals captured yet.</p>
        )}
      </section>

      <section className="panel">
        <h2>Pages</h2>
        <ul className="website-plan-list">
          {plan.pages.map((page) => (
            <li key={page.key} className="website-plan-item">
              <div>
                <strong>{page.title}</strong>
                <p className="muted">{pageOriginLabel(page.origin)}</p>
                {page.notes ? <p>{page.notes}</p> : null}
              </div>
              {editing ? (
                <div className="button-row">
                  {page.origin !== "CUSTOMER_REMOVED_FROM_RECOMMENDATION" ? (
                    <button
                      type="button"
                      className="secondary"
                      disabled={mutationsLocked}
                      onClick={() => {
                        setPendingEditPageKey(page.key);
                        setEditTitle(page.title);
                        setEditNotes(page.notes ?? "");
                      }}
                    >
                      Edit
                    </button>
                  ) : null}
                  {page.origin === "FP_RECOMMENDED" ? (
                    <button
                      type="button"
                      className="secondary"
                      disabled={mutationsLocked}
                      onClick={() =>
                        submitRevision(
                          { removeRecommendedPages: [{ pageKey: page.key }] },
                          "Recommendation removed.",
                        )
                      }
                    >
                      Remove recommendation
                    </button>
                  ) : null}
                  {page.origin === "CUSTOMER_REMOVED_FROM_RECOMMENDATION" ? (
                    <button
                      type="button"
                      className="secondary"
                      disabled={mutationsLocked}
                      onClick={() =>
                        submitRevision(
                          { restoreRecommendedPages: [{ pageKey: page.key }] },
                          "Recommendation restored.",
                        )
                      }
                    >
                      Restore
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        {editing && pendingEditPageKey ? (
          <div className="website-plan-editor">
            <h3>Edit page</h3>
            <label htmlFor="edit-page-title">Title</label>
            <input
              id="edit-page-title"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              disabled={mutationsLocked}
            />
            <label htmlFor="edit-page-notes">Notes</label>
            <textarea
              id="edit-page-notes"
              value={editNotes}
              onChange={(event) => setEditNotes(event.target.value)}
              disabled={mutationsLocked}
            />
            <div className="button-row">
              <button
                type="button"
                disabled={mutationsLocked || !editTitle.trim()}
                onClick={() =>
                  submitRevision(
                    {
                      editPages: [
                        {
                          pageKey: pendingEditPageKey,
                          title: editTitle.trim(),
                          notes: editNotes.trim() || undefined,
                        },
                      ],
                    },
                    "Page updated.",
                  )
                }
              >
                Save page
              </button>
              <button
                type="button"
                className="secondary"
                disabled={mutationsLocked}
                onClick={() => {
                  setPendingEditPageKey(null);
                  setEditTitle("");
                  setEditNotes("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {editing ? (
          <div className="website-plan-editor">
            <h3>Add a page</h3>
            <label htmlFor="add-page-title">Title</label>
            <input
              id="add-page-title"
              value={addTitle}
              onChange={(event) => setAddTitle(event.target.value)}
              disabled={mutationsLocked}
            />
            <label htmlFor="add-page-notes">Notes</label>
            <textarea
              id="add-page-notes"
              value={addNotes}
              onChange={(event) => setAddNotes(event.target.value)}
              disabled={mutationsLocked}
            />
            <button
              type="button"
              disabled={mutationsLocked || !addTitle.trim()}
              onClick={() =>
                submitRevision(
                  {
                    addPages: [
                      {
                        title: addTitle.trim(),
                        notes: addNotes.trim() || undefined,
                      },
                    ],
                  },
                  "Page added.",
                )
              }
            >
              Add page
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>Required functionality</h2>
        {functionalityLabels.length > 0 ? (
          <ul>
            {functionalityLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">None listed.</p>
        )}
      </section>

      <section className="panel">
        <h2>Modules</h2>
        {plan.modules.length > 0 ? (
          <ul className="website-plan-list">
            {plan.modules.map((module) => (
              <li key={module.moduleKey} className="website-plan-item">
                <div>
                  <strong>{moduleKeyLabel(module.moduleKey)}</strong>
                  <p className="muted">
                    {moduleInclusionLabel(module.inclusion)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No modules listed yet.</p>
        )}
        {editing ? (
          <div className="button-row">
            <button
              type="button"
              className="secondary"
              disabled={mutationsLocked}
              onClick={() =>
                submitRevision(
                  {
                    moduleIntents: [
                      { moduleKey: "booklocal", intent: "SELECT" },
                    ],
                  },
                  "BookLocal selected.",
                )
              }
            >
              {booklocal?.inclusion === "INCLUDED"
                ? "Keep BookLocal"
                : "Select BookLocal scheduling"}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={mutationsLocked}
              onClick={() =>
                submitRevision(
                  {
                    moduleIntents: [
                      { moduleKey: "booklocal", intent: "DECLINE" },
                    ],
                  },
                  "BookLocal declined.",
                )
              }
            >
              Decline BookLocal
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>Custom requirements</h2>
        {plan.customRequirements.length > 0 ? (
          <ul className="website-plan-list">
            {plan.customRequirements.map((item, index) => (
              <li key={`${index}-${item}`} className="website-plan-item">
                <div>
                  <p>{item}</p>
                </div>
                {editing ? (
                  <div className="button-row">
                    <button
                      type="button"
                      className="secondary"
                      disabled={mutationsLocked}
                      onClick={() => {
                        setPendingCustomIndex(index);
                        setCustomEditDraft(item);
                      }}
                    >
                      Edit requirement
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={mutationsLocked}
                      onClick={() => {
                        const next = plan.customRequirements.filter(
                          (_, i) => i !== index,
                        );
                        submitRevision(
                          { customRequirements: next },
                          "Custom requirement removed.",
                        );
                      }}
                    >
                      Remove requirement
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">None listed.</p>
        )}
        {editing && pendingCustomIndex !== null ? (
          <div className="website-plan-editor">
            <h3>Edit custom requirement</h3>
            <label htmlFor="edit-custom-requirement">Requirement</label>
            <textarea
              id="edit-custom-requirement"
              value={customEditDraft}
              onChange={(event) => setCustomEditDraft(event.target.value)}
              disabled={mutationsLocked}
            />
            <div className="button-row">
              <button
                type="button"
                disabled={mutationsLocked || !customEditDraft.trim()}
                onClick={() => {
                  const next = [...plan.customRequirements];
                  next[pendingCustomIndex] = customEditDraft.trim();
                  submitRevision(
                    { customRequirements: next },
                    "Custom requirement updated.",
                  );
                }}
              >
                Save requirement
              </button>
              <button
                type="button"
                className="secondary"
                disabled={mutationsLocked}
                onClick={() => {
                  setPendingCustomIndex(null);
                  setCustomEditDraft("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        {editing ? (
          <div className="website-plan-editor">
            <label htmlFor="custom-requirement">Add custom requirement</label>
            <textarea
              id="custom-requirement"
              value={customDraft}
              onChange={(event) => setCustomDraft(event.target.value)}
              disabled={mutationsLocked}
            />
            <button
              type="button"
              disabled={mutationsLocked || !customDraft.trim()}
              onClick={() =>
                submitRevision(
                  {
                    customRequirements: [
                      ...plan.customRequirements,
                      customDraft.trim(),
                    ],
                  },
                  "Custom requirement saved.",
                )
              }
            >
              Save custom requirement
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>Design direction</h2>
        <p>{plan.designDirection || "Not captured yet."}</p>
      </section>

      <section className="panel">
        <h2>Available content</h2>
        <p>{plan.availableContentNotes || "None noted."}</p>
        {plan.assetReferences.length > 0 ? (
          <p className="muted">
            Linked project assets: {plan.assetReferences.length}
          </p>
        ) : null}
      </section>

      <section className="panel">
        <h2>Missing content</h2>
        <p>{plan.missingContentNotes || "None noted."}</p>
      </section>

      <section className="panel">
        <h2>Assumptions</h2>
        {plan.customerFacingAssumptions.length > 0 ? (
          <ul>
            {plan.customerFacingAssumptions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">None listed.</p>
        )}
      </section>

      {!incomplete && !plan.confirmed && !editing ? (
        <section className="panel">
          <h2>Review and confirm</h2>
          <p>
            Confirming means you accept this exact Website Plan version as the
            current scope and direction. This is not payment authorization and
            does not start production.
          </p>
          <div className="button-row">
            <button
              type="button"
              disabled={mutationsLocked || !showConfirm}
              aria-busy={isPending}
              onClick={handleConfirm}
            >
              {isPending ? "Confirming…" : "Confirm Website Plan"}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={mutationsLocked}
              onClick={() => setEditing(true)}
            >
              Edit Website Plan
            </button>
          </div>
        </section>
      ) : null}

      {editing ? (
        <section className="panel">
          <h2>Editing Website Plan</h2>
          <p>
            Changes create a new Plan version. After you finish editing, confirm
            the new version.
          </p>
          <div className="button-row">
            {!incomplete && !plan.confirmed ? (
              <button
                type="button"
                disabled={mutationsLocked}
                onClick={handleConfirm}
              >
                Confirm Website Plan
              </button>
            ) : null}
            <button
              type="button"
              className="secondary"
              disabled={isPending}
              onClick={() => setEditing(false)}
            >
              Done editing
            </button>
          </div>
        </section>
      ) : null}

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
