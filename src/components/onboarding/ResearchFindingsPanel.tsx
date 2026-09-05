"use client";

import { useEffect, useRef, useState } from "react";
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
  onAuthoritativeSyncBusyChange: (busy: boolean) => void;
};

type OperationIdentity = {
  operationId: string;
  correlationId: string;
};

type IntentKey = string;

/** Exported for focused identity tests. */
export function researchReconcileIntentKey(
  action: ReconcileResearchAction,
  candidateId: string,
  options?: {
    value?: unknown;
    expectedSectionVersion?: number;
  },
): IntentKey {
  if (action === "reject") {
    return `reject:${candidateId}`;
  }
  const version = options?.expectedSectionVersion;
  if (action === "accept") {
    return `accept:${candidateId}:v${String(version)}`;
  }
  try {
    return `edit:${candidateId}:v${String(version)}:${JSON.stringify(options?.value)}`;
  } catch {
    return `edit:${candidateId}:v${String(version)}:${String(options?.value)}`;
  }
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
  onAuthoritativeSyncBusyChange,
}: ResearchFindingsPanelProps) {
  const router = useRouter();
  const [busyCandidateId, setBusyCandidateId] = useState<string | null>(null);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<unknown>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [reviewedOpen, setReviewedOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [authorityBusy, setAuthorityBusy] = useState(false);

  const identityByIntent = useRef<Map<IntentKey, OperationIdentity>>(new Map());
  const inFlightResearchPoll = useRef(false);
  const authorityBusyRef = useRef(false);
  const researchEpochRef = useRef(0);
  const researchRef = useRef(research);
  const flushBeforeReconcileRef = useRef(flushBeforeReconcile);
  const getSectionVersionRef = useRef(getSectionVersion);
  const onAuthoritativeStateRef = useRef(onAuthoritativeState);
  const onNoticeRef = useRef(onNotice);
  const onAuthoritativeSyncBusyChangeRef = useRef(onAuthoritativeSyncBusyChange);
  const routerRef = useRef(router);

  useEffect(() => {
    researchRef.current = research;
  }, [research]);

  const pollResearchOnlyRef = useRef<() => Promise<void>>(async () => undefined);

  const setSyncBusy = (busy: boolean) => {
    authorityBusyRef.current = busy;
    if (busy) {
      researchEpochRef.current += 1;
    }
    setAuthorityBusy(busy);
    onAuthoritativeSyncBusyChangeRef.current(busy);
  };

  useEffect(() => {
    flushBeforeReconcileRef.current = flushBeforeReconcile;
    getSectionVersionRef.current = getSectionVersion;
    onAuthoritativeStateRef.current = onAuthoritativeState;
    onNoticeRef.current = onNotice;
    onAuthoritativeSyncBusyChangeRef.current = onAuthoritativeSyncBusyChange;
    routerRef.current = router;
    pollResearchOnlyRef.current = async () => {
      if (authorityBusyRef.current || inFlightResearchPoll.current) return;
      inFlightResearchPoll.current = true;
      const epochAtStart = researchEpochRef.current;
      setRefreshing(true);
      try {
        const result = await refreshProjectResearchAction(projectId);
        // Release the poll lock before applying so a waiting reconciliation can
        // start and advance the research epoch; the checks below drop stale data.
        inFlightResearchPoll.current = false;
        setRefreshing(false);
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
        });
        if (
          authorityBusyRef.current ||
          epochAtStart !== researchEpochRef.current
        ) {
          return;
        }
        if (!result.ok) {
          if (result.signInPath) {
            routerRef.current.push(result.signInPath);
            return;
          }
          onNoticeRef.current(
            "Research status could not be refreshed. Manual onboarding is still available.",
            "info",
          );
          return;
        }
        if (
          authorityBusyRef.current ||
          epochAtStart !== researchEpochRef.current
        ) {
          return;
        }
        onAuthoritativeStateRef.current({ research: result.research });
      } finally {
        inFlightResearchPoll.current = false;
        setRefreshing(false);
      }
    };
  });

  const shouldPollResearch =
    research.status === "ready" && hasActiveResearch(research.data.runs);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    if (!shouldPollResearch) {
      return () => {
        cancelled = true;
        stop();
      };
    }

    const tick = () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      if (authorityBusyRef.current) {
        return;
      }
      const current = researchRef.current;
      if (current.status !== "ready" || !hasActiveResearch(current.data.runs)) {
        stop();
        return;
      }
      void pollResearchOnlyRef.current();
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
        if (
          current.status === "ready" &&
          hasActiveResearch(current.data.runs) &&
          !authorityBusyRef.current
        ) {
          void pollResearchOnlyRef.current().then(() => {
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
  }, [shouldPollResearch, projectId]);

  const getIdentity = (
    action: ReconcileResearchAction,
    candidateId: string,
    options?: { value?: unknown; expectedSectionVersion?: number },
  ): OperationIdentity => {
    const key = researchReconcileIntentKey(action, candidateId, options);
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
    options?: { value?: unknown; expectedSectionVersion?: number },
  ) => {
    identityByIntent.current.delete(
      researchReconcileIntentKey(action, candidateId, options),
    );
  };

  const runReconcile = async (input: {
    action: ReconcileResearchAction;
    candidate: ResearchCandidate;
    value?: unknown;
  }) => {
    // While an auto-poll is in flight, mutation controls are disabled. Also hard-stop
    // here so a forced click cannot overlap a poll that has not yet finished.
    if (busyCandidateId || authorityBusy || inFlightResearchPoll.current) return;
    setBusyCandidateId(input.candidate.id);
    setEditError(null);
    setSyncBusy(true);

    let identityOptions:
      | { value?: unknown; expectedSectionVersion?: number }
      | undefined;

    try {
      const flushed = await flushBeforeReconcileRef.current();
      if (!flushed) {
        onNoticeRef.current(
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
          onNoticeRef.current(
            "This finding cannot be confirmed into onboarding.",
            "error",
          );
          return;
        }
        expectedSectionVersion = getSectionVersionRef.current(field.sectionKey);
      }

      identityOptions =
        input.action === "reject"
          ? undefined
          : {
              expectedSectionVersion,
              value: input.action === "edit" ? input.value : undefined,
            };

      const identity = getIdentity(
        input.action,
        input.candidate.id,
        identityOptions,
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
          routerRef.current.push(result.signInPath);
          return;
        }

        if (result.onboarding || result.research) {
          onAuthoritativeStateRef.current({
            onboarding: result.onboarding,
            research: result.research ?? researchRef.current,
          });
        }

        if (result.category === "temporary_failure") {
          onNoticeRef.current(result.message, "error");
          return;
        }

        clearIdentity(input.action, input.candidate.id, identityOptions);

        if (result.category === "already_completed") {
          onNoticeRef.current(result.message, "info");
          setEditingCandidateId(null);
          return;
        }

        if (result.category === "stale_or_conflicting") {
          onNoticeRef.current(result.message, "error");
          setEditingCandidateId(null);
          return;
        }

        onNoticeRef.current(result.message, "error");
        return;
      }

      clearIdentity(input.action, input.candidate.id, identityOptions);
      onAuthoritativeStateRef.current({
        onboarding: result.onboarding,
        research: result.research,
      });
      setEditingCandidateId(null);
      onNoticeRef.current(
        input.action === "reject"
          ? "Finding dismissed."
          : "Finding confirmed into onboarding.",
        "success",
      );
    } finally {
      setBusyCandidateId(null);
      setSyncBusy(false);
    }
  };

  const handleManualRefresh = async () => {
    if (inFlightResearchPoll.current || authorityBusy || busyCandidateId) return;
    setSyncBusy(true);
    setRefreshing(true);
    try {
      const flushed = await flushBeforeReconcileRef.current();
      if (!flushed) {
        onNoticeRef.current(
          "Save your current onboarding edits before refreshing findings.",
          "error",
        );
        return;
      }

      const result = await reloadAuthoritativeOnboardingAndResearchAction(projectId);
      if (!result.ok) {
        if (result.signInPath) {
          routerRef.current.push(result.signInPath);
          return;
        }
        onNoticeRef.current(
          "Could not fully refresh. Manual onboarding is still available.",
          "info",
        );
        return;
      }
      onAuthoritativeStateRef.current({
        onboarding: result.onboarding,
        research: result.research,
      });
      onNoticeRef.current("Findings refreshed.", "info");
    } finally {
      setRefreshing(false);
      setSyncBusy(false);
    }
  };

  const startEdit = (candidate: ResearchCandidate) => {
    if (authorityBusy || busyCandidateId) return;
    setEditingCandidateId(candidate.id);
    setEditValue(candidate.extractedValue);
    setEditError(null);
  };

  const submitEdit = async (candidate: ResearchCandidate) => {
    const field = candidate.fieldKey ? fieldByKey(candidate.fieldKey) : undefined;
    if (!field) {
      onNoticeRef.current("This finding cannot be edited into onboarding.", "error");
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
  const controlsBusy =
    authorityBusy || busyCandidateId !== null || refreshing;

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
          disabled={controlsBusy || refreshing}
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
                      disabled={controlsBusy}
                      onChange={setEditValue}
                    />
                    {editError ? <p className="form-error">{editError}</p> : null}
                    <div className="button-row">
                      <button
                        type="button"
                        disabled={controlsBusy}
                        onClick={() => void submitEdit(candidate)}
                      >
                        Save edited value
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={controlsBusy}
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
                      disabled={controlsBusy}
                      onClick={() =>
                        void runReconcile({ action: "accept", candidate })
                      }
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={controlsBusy}
                      onClick={() => startEdit(candidate)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={controlsBusy}
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
                  disabled={controlsBusy}
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
