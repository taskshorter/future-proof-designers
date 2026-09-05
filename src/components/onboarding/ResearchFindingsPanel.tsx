"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { OnboardingFieldEditor } from "@/components/onboarding/FieldEditors";
import type {
  OnboardingSectionKey,
  ProjectOnboardingState,
  ResearchCandidate,
  ResearchSource,
} from "@/lib/factory/contract";
import type {
  ReconcileResearchAction,
  ResearchLoadState,
} from "@/lib/onboarding/actions";
import {
  reconcileResearchCandidateAction,
  refreshProjectResearchAction,
  reloadAuthoritativeOnboardingAndResearchAction,
} from "@/lib/onboarding/actions";
import { fieldByKey, isFieldValueEmpty, prepareAnswerForSave } from "@/lib/onboarding/field-ui";
import {
  formatCandidateValueForDisplay,
  groupPendingMappedCandidates,
  hasActiveResearch,
  isSafeExternalHttpUrl,
  primaryResearchRun,
  RESEARCH_POLL_INTERVAL_MS,
  researchStatusLabel,
  reviewedCandidates,
  sourcesForCandidate,
  unmappedPendingCandidates,
} from "@/lib/onboarding/research-ui";

type ResearchFindingsPanelProps = {
  projectId: string;
  research: ResearchLoadState;
  activeSection: OnboardingSectionKey;
  getSectionVersion: (sectionKey: OnboardingSectionKey) => number;
  flushBeforeReconcile: () => Promise<boolean>;
  onAuthoritativeState: (input: {
    onboarding?: ProjectOnboardingState;
    research: ResearchLoadState;
  }) => void;
  onNotice: (message: string, tone?: "info" | "error" | "success") => void;
};

type OperationIdentity = {
  operationId: string;
  correlationId: string;
};

type IntentKey = string;

function intentKeyFor(
  action: ReconcileResearchAction,
  candidateId: string,
  value?: unknown,
): IntentKey {
  if (action === "edit") {
    try {
      return `${action}:${candidateId}:${JSON.stringify(value)}`;
    } catch {
      return `${action}:${candidateId}:${String(value)}`;
    }
  }
  return `${action}:${candidateId}`;
}

function SourceEvidenceList({
  candidate,
  sources,
}: {
  candidate: ResearchCandidate;
  sources: ResearchSource[];
}) {
  const linked = sourcesForCandidate(candidate, sources);
  if (linked.length === 0) {
    return <p className="muted">No source links available for this finding.</p>;
  }
  return (
    <ul className="research-source-list">
      {linked.map((source) => {
        const safe = isSafeExternalHttpUrl(source.sourceUrl);
        return (
          <li key={source.id}>
            <span className="muted">{source.classification}</span>
            {safe ? (
              <a
                href={source.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {source.sourceUrl}
              </a>
            ) : (
              <span>{source.sourceUrl}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ResearchFindingsPanel({
  projectId,
  research,
  activeSection,
  getSectionVersion,
  flushBeforeReconcile,
  onAuthoritativeState,
  onNotice,
}: ResearchFindingsPanelProps) {
  const router = useRouter();
  const [busyCandidateId, setBusyCandidateId] = useState<string | null>(null);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<unknown>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [reviewedOpen, setReviewedOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const identityByIntent = useRef<Map<IntentKey, OperationIdentity>>(new Map());
  const inFlightRefresh = useRef(false);
  const researchRef = useRef(research);

  useEffect(() => {
    researchRef.current = research;
  }, [research]);

  const refreshResearchOnly = useCallback(async () => {
    if (inFlightRefresh.current) return;
    inFlightRefresh.current = true;
    setRefreshing(true);
    try {
      const result = await refreshProjectResearchAction(projectId);
      if (!result.ok) {
        if (result.signInPath) {
          router.push(result.signInPath);
          return;
        }
        onNotice(
          "Research status could not be refreshed. Manual onboarding is still available.",
          "info",
        );
        return;
      }
      onAuthoritativeState({ research: result.research });
    } finally {
      inFlightRefresh.current = false;
      setRefreshing(false);
    }
  }, [onAuthoritativeState, onNotice, projectId, router]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const tick = () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      const current = researchRef.current;
      if (current.status !== "ready" || !hasActiveResearch(current.data.runs)) {
        stop();
        return;
      }
      void refreshResearchOnly();
    };

    const start = () => {
      stop();
      const current = researchRef.current;
      if (current.status !== "ready" || !hasActiveResearch(current.data.runs)) {
        return;
      }
      timer = setInterval(tick, RESEARCH_POLL_INTERVAL_MS);
    };

    const onVisibility = () => {
      if (cancelled) return;
      if (document.visibilityState === "visible") {
        const current = researchRef.current;
        if (current.status === "ready" && hasActiveResearch(current.data.runs)) {
          void refreshResearchOnly().then(() => {
            if (!cancelled) start();
          });
        }
      } else {
        stop();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [research, refreshResearchOnly]);

  const getIdentity = (
    action: ReconcileResearchAction,
    candidateId: string,
    value?: unknown,
  ): OperationIdentity => {
    const key = intentKeyFor(action, candidateId, value);
    const existing = identityByIntent.current.get(key);
    if (existing) return existing;
    const created = {
      operationId: crypto.randomUUID(),
      correlationId: crypto.randomUUID(),
    };
    identityByIntent.current.set(key, created);
    return created;
  };

  const clearIdentity = (
    action: ReconcileResearchAction,
    candidateId: string,
    value?: unknown,
  ) => {
    identityByIntent.current.delete(intentKeyFor(action, candidateId, value));
  };

  const runReconcile = async (input: {
    action: ReconcileResearchAction;
    candidate: ResearchCandidate;
    value?: unknown;
  }) => {
    if (busyCandidateId) return;
    setBusyCandidateId(input.candidate.id);
    setEditError(null);

    try {
      const flushed = await flushBeforeReconcile();
      if (!flushed) {
        onNotice(
          "Save your current onboarding edits before confirming this finding.",
          "error",
        );
        return;
      }

      let expectedSectionVersion: number | undefined;
      if (input.action === "accept" || input.action === "edit") {
        const field = input.candidate.fieldKey
          ? fieldByKey(input.candidate.fieldKey)
          : undefined;
        if (!field) {
          onNotice("This finding cannot be confirmed into onboarding.", "error");
          return;
        }
        expectedSectionVersion = getSectionVersion(field.sectionKey);
      }

      const identity = getIdentity(
        input.action,
        input.candidate.id,
        input.action === "edit" ? input.value : undefined,
      );

      const result = await reconcileResearchCandidateAction({
        projectId,
        candidateId: input.candidate.id,
        action: input.action,
        operationId: identity.operationId,
        correlationId: identity.correlationId,
        expectedSectionVersion,
        value: input.action === "edit" ? input.value : undefined,
      });

      if (!result.ok) {
        if (result.signInPath) {
          router.push(result.signInPath);
          return;
        }

        if (result.onboarding || result.research) {
          onAuthoritativeState({
            onboarding: result.onboarding,
            research: result.research ?? research,
          });
        }

        if (result.category === "temporary_failure") {
          onNotice(result.message, "error");
          return;
        }

        clearIdentity(
          input.action,
          input.candidate.id,
          input.action === "edit" ? input.value : undefined,
        );

        if (result.category === "already_completed") {
          onNotice(result.message, "info");
          setEditingCandidateId(null);
          return;
        }

        if (result.category === "stale_or_conflicting") {
          onNotice(result.message, "error");
          setEditingCandidateId(null);
          return;
        }

        onNotice(result.message, "error");
        return;
      }

      clearIdentity(
        input.action,
        input.candidate.id,
        input.action === "edit" ? input.value : undefined,
      );
      onAuthoritativeState({
        onboarding: result.onboarding,
        research: result.research,
      });
      setEditingCandidateId(null);
      onNotice(
        input.action === "reject"
          ? "Finding dismissed."
          : "Finding confirmed into onboarding.",
        "success",
      );
    } finally {
      setBusyCandidateId(null);
    }
  };

  const handleManualRefresh = async () => {
    if (inFlightRefresh.current) return;
    inFlightRefresh.current = true;
    setRefreshing(true);
    try {
      const result = await reloadAuthoritativeOnboardingAndResearchAction(projectId);
      if (!result.ok) {
        if (result.signInPath) {
          router.push(result.signInPath);
          return;
        }
        // Fall back to research-only refresh so manual onboarding stays usable
        const researchOnly = await refreshProjectResearchAction(projectId);
        if (researchOnly.ok) {
          onAuthoritativeState({ research: researchOnly.research });
        }
        onNotice(
          "Could not fully refresh. Manual onboarding is still available.",
          "info",
        );
        return;
      }
      onAuthoritativeState({
        onboarding: result.onboarding,
        research: result.research,
      });
      onNotice("Findings refreshed.", "info");
    } finally {
      inFlightRefresh.current = false;
      setRefreshing(false);
    }
  };

  const startEdit = (candidate: ResearchCandidate) => {
    setEditingCandidateId(candidate.id);
    setEditValue(candidate.extractedValue);
    setEditError(null);
  };

  const submitEdit = async (candidate: ResearchCandidate) => {
    const field = candidate.fieldKey ? fieldByKey(candidate.fieldKey) : undefined;
    if (!field) {
      onNotice("This finding cannot be edited into onboarding.", "error");
      return;
    }
    if (isFieldValueEmpty(editValue)) {
      setEditError("Enter a value, or reject the finding instead.");
      return;
    }
    const prepared = prepareAnswerForSave(field, editValue);
    if (prepared.kind === "omit") {
      setEditError("Enter a value, or reject the finding instead.");
      return;
    }
    if (prepared.kind === "error") {
      setEditError(prepared.message);
      return;
    }
    await runReconcile({
      action: "edit",
      candidate,
      value: prepared.value,
    });
  };

  const primary =
    research.status === "ready" ? primaryResearchRun(research.data.runs) : null;
  const sources = research.status === "ready" ? research.data.sources : [];
  const candidates = research.status === "ready" ? research.data.candidates : [];
  const stageGroups =
    research.status === "ready"
      ? groupPendingMappedCandidates(
          candidates,
          activeSection === "REVIEW" ? "ALL" : activeSection,
        ).filter((group) =>
          activeSection === "REVIEW" ? true : group.sectionKey === activeSection,
        )
      : [];
  const reviewUnmapped =
    activeSection === "REVIEW" ? unmappedPendingCandidates(candidates) : [];
  const reviewed = reviewedCandidates(candidates);

  return (
    <section className="panel research-findings" aria-label="Research findings">
      <div className="research-status-row">
        <div>
          <h2>Research findings</h2>
          {research.status === "unavailable" ? (
            <p className="muted">
              Research is currently unavailable. You can continue deeper onboarding
              manually.
            </p>
          ) : primary ? (
            <>
              <p>
                Status: <strong>{researchStatusLabel(primary.status)}</strong>
              </p>
              {primary.status === "PARTIAL" ? (
                <p className="muted">
                  Completed with gaps. Useful findings may still be available, and you
                  can continue manually anytime.
                </p>
              ) : null}
              {primary.status === "FAILED" ? (
                <p className="muted">
                  Research is unavailable right now. Manual onboarding remains available.
                </p>
              ) : null}
              {hasActiveResearch(research.data.runs) ? (
                <p className="muted">Checking for updates every few seconds…</p>
              ) : null}
            </>
          ) : (
            <p className="muted">
              No research findings yet. Enter answers manually anytime.
            </p>
          )}
        </div>
        <button
          type="button"
          className="secondary"
          disabled={refreshing || busyCandidateId !== null}
          onClick={() => void handleManualRefresh()}
        >
          {refreshing ? "Refreshing…" : "Refresh findings"}
        </button>
      </div>

      {stageGroups.map((group) => (
        <div key={group.fieldKey} className="research-field-group">
          <h3>{group.label}</h3>
          {group.hasConflict ? (
            <p className="research-conflict" role="status">
              We found more than one possible value for this field. Review the sources
              before confirming.
            </p>
          ) : null}
          {group.candidates.map((candidate) => {
            const field = fieldByKey(group.fieldKey)!;
            const editing = editingCandidateId === candidate.id;
            return (
              <article
                key={candidate.id}
                className="research-candidate"
                data-candidate-id={candidate.id}
              >
                <p className="research-extracted">
                  Suggested value:{" "}
                  <span>{formatCandidateValueForDisplay(candidate.extractedValue)}</span>
                </p>
                {candidate.advisoryConfidence !== null ? (
                  <p className="muted">
                    Advisory confidence: {candidate.advisoryConfidence}
                  </p>
                ) : null}
                <SourceEvidenceList candidate={candidate} sources={sources} />
                {editing ? (
                  <div className="research-edit">
                    <OnboardingFieldEditor
                      field={field}
                      value={editValue}
                      disabled={busyCandidateId === candidate.id}
                      onChange={setEditValue}
                    />
                    {editError ? <p className="form-error">{editError}</p> : null}
                    <div className="button-row">
                      <button
                        type="button"
                        disabled={busyCandidateId === candidate.id}
                        onClick={() => void submitEdit(candidate)}
                      >
                        Save edited value
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={busyCandidateId === candidate.id}
                        onClick={() => {
                          setEditingCandidateId(null);
                          setEditError(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="button-row">
                    <button
                      type="button"
                      disabled={busyCandidateId !== null}
                      onClick={() =>
                        void runReconcile({ action: "accept", candidate })
                      }
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={busyCandidateId !== null}
                      onClick={() => startEdit(candidate)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={busyCandidateId !== null}
                      onClick={() =>
                        void runReconcile({ action: "reject", candidate })
                      }
                    >
                      Reject
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ))}

      {reviewUnmapped.length > 0 ? (
        <div className="research-field-group">
          <h3>Other findings</h3>
          <p className="muted">
            These findings do not map to a known onboarding field. You can review evidence
            and dismiss them.
          </p>
          {reviewUnmapped.map((candidate) => (
            <article
              key={candidate.id}
              className="research-candidate"
              data-candidate-id={candidate.id}
            >
              <p className="research-extracted">
                Suggested value:{" "}
                <span>{formatCandidateValueForDisplay(candidate.extractedValue)}</span>
              </p>
              <SourceEvidenceList candidate={candidate} sources={sources} />
              <div className="button-row">
                <button
                  type="button"
                  className="secondary"
                  disabled={busyCandidateId !== null}
                  onClick={() => void runReconcile({ action: "reject", candidate })}
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {reviewed.length > 0 ? (
        <details
          className="research-reviewed"
          open={reviewedOpen}
          onToggle={(event) => setReviewedOpen((event.target as HTMLDetailsElement).open)}
        >
          <summary>Reviewed findings ({reviewed.length})</summary>
          {reviewed.map((candidate) => (
            <article
              key={candidate.id}
              className="research-candidate reviewed"
              data-candidate-id={candidate.id}
              data-disposition={candidate.disposition}
            >
              <p>
                <span className="muted">{candidate.disposition}</span>
                {candidate.fieldKey ? (
                  <>
                    {" · "}
                    {fieldByKey(candidate.fieldKey)?.label ?? candidate.fieldKey}
                  </>
                ) : null}
              </p>
              <p className="research-extracted">
                {formatCandidateValueForDisplay(candidate.extractedValue)}
              </p>
              <SourceEvidenceList candidate={candidate} sources={sources} />
            </article>
          ))}
        </details>
      ) : null}
    </section>
  );
}
