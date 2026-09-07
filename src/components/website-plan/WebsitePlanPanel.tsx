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
  attentionMessage,
  moduleInclusionLabel,
  moduleKeyLabel,
  packageCategoryLabel,
  pageOriginLabel,
} from "@/lib/website-plan/labels";

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
  const [addTitle, setAddTitle] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [customDraft, setCustomDraft] = useState("");
  const [pendingEditPageKey, setPendingEditPageKey] = useState<string | null>(
    null,
  );
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
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
    revision: WebsitePlanRevision;
  } | null>(null);

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
      if (!plan) return;
      if (
        !revisionIntentRef.current ||
        revisionIntentRef.current.expectedPlanVersion !== plan.planVersion
      ) {
        revisionIntentRef.current = {
          operationId: newId(),
          correlationId: newId(),
          expectedPlanVersion: plan.planVersion,
          revision,
        };
      } else {
        revisionIntentRef.current = {
          ...revisionIntentRef.current,
          revision,
        };
      }
      const intent = revisionIntentRef.current;
      startTransition(async () => {
        const result = await reviseWebsitePlanAction(projectId, intent);
        if (!result.ok) {
          if (result.signInPath) {
            window.location.assign(result.signInPath);
            return;
          }
          if (result.category === "stale_or_conflicting") {
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
        setEditing(true);
        setFeedback(successMessage, "success");
      });
    },
    [plan, projectId, setFeedback],
  );

  const handleConfirm = useCallback(() => {
    if (!plan || isPlanIncomplete(plan) || plan.confirmed) return;
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
      const requiredAction = result.requiredAction ?? result.plan.requiredAction;
      if (requiredAction === "OWNER" || result.plan.packageCategory === "CUSTOM") {
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
  }, [plan, projectId, setFeedback]);

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
  const showConfirm = !incomplete && !plan.confirmed && !editing;
  const showConfirmedBanner = plan.confirmed && !editing;
  const booklocal = plan.modules.find((module) => module.moduleKey === "booklocal");

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
          {statusTone === "conflict" ? (
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

      {incomplete ? (
        <section className="panel">
          <h2>This Plan is not ready to confirm</h2>
          <p>
            Add the missing project details, then prepare or refresh the Website
            Plan. Factory remains the authority for package classification.
          </p>
          <ul>
            {plan.customerSafeAttention.map((item) => (
              <li key={item}>{item}</li>
            ))}
            {plan.classificationAttention.map((flag) => (
              <li key={flag}>{attentionMessage(flag)}</li>
            ))}
          </ul>
          <div className="button-row">
            <Link
              className="button-link"
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
          {plan.packageCategory === "CUSTOM" ||
          plan.requiredAction === "OWNER" ? (
            <p>
              Your Website Plan is confirmed. This project needs custom
              commercial terms, so our team will review the scope before pricing
              is available.
            </p>
          ) : (
            <p>
              Your Website Plan is confirmed. We’re preparing the next pricing
              and review step.
            </p>
          )}
          <p className="muted">
            Pricing will be available after the next review step.
          </p>
          <div className="button-row">
            <button
              type="button"
              className="secondary"
              disabled={isPending}
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
        <p>{plan.packageRationale}</p>
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
                      disabled={isPending}
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
                      disabled={isPending}
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
                      disabled={isPending}
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
              disabled={isPending}
            />
            <label htmlFor="edit-page-notes">Notes</label>
            <textarea
              id="edit-page-notes"
              value={editNotes}
              onChange={(event) => setEditNotes(event.target.value)}
              disabled={isPending}
            />
            <div className="button-row">
              <button
                type="button"
                disabled={isPending || !editTitle.trim()}
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
                disabled={isPending}
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
              disabled={isPending}
            />
            <label htmlFor="add-page-notes">Notes</label>
            <textarea
              id="add-page-notes"
              value={addNotes}
              onChange={(event) => setAddNotes(event.target.value)}
              disabled={isPending}
            />
            <button
              type="button"
              disabled={isPending || !addTitle.trim()}
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
        {plan.requiredFunctionality.length > 0 ? (
          <ul>
            {plan.requiredFunctionality.map((item) => (
              <li key={item}>{item}</li>
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
              disabled={isPending}
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
              disabled={isPending}
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
          <ul>
            {plan.customRequirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">None listed.</p>
        )}
        {editing ? (
          <div className="website-plan-editor">
            <label htmlFor="custom-requirement">Add custom requirement</label>
            <textarea
              id="custom-requirement"
              value={customDraft}
              onChange={(event) => setCustomDraft(event.target.value)}
              disabled={isPending}
            />
            <button
              type="button"
              disabled={isPending || !customDraft.trim()}
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
              disabled={isPending || !showConfirm}
              aria-busy={isPending}
              onClick={handleConfirm}
            >
              {isPending ? "Confirming…" : "Confirm Website Plan"}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={isPending}
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
                disabled={isPending}
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
