"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { OnboardingFieldEditor } from "@/components/onboarding/FieldEditors";
import { ResearchFindingsPanel } from "@/components/onboarding/ResearchFindingsPanel";
import { buildSignInPath } from "@/lib/auth/safe-return-path";
import type {
  OnboardingSectionKey,
  OnboardingSectionStatus,
  ProjectOnboardingState,
  ProjectResumeDetail,
} from "@/lib/factory/contract";
import {
  reloadProjectOnboardingAction,
  saveOnboardingSectionAction,
  type ResearchLoadState,
} from "@/lib/onboarding/actions";
import {
  AUTOSAVE_DEBOUNCE_MS,
  SECTION_LABELS,
  SECTION_ORDER,
  fieldByKey,
  fieldsForSection,
  isFieldValueEmpty,
  prepareAnswerForSave,
  semanticEqual,
  type OnboardingFieldUi,
} from "@/lib/onboarding/field-ui";

type SaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

type SectionLocalState = {
  status: OnboardingSectionStatus;
  version: number;
  values: Record<string, unknown>;
  savedValues: Record<string, unknown>;
  savedKeys: Set<string>;
  conflict: boolean;
  fieldError: string | null;
  revealHidden: boolean;
};

type SaveRequestSnapshot = {
  sectionKey: OnboardingSectionKey;
  expectedVersion: number;
  status: "IN_PROGRESS" | "COMPLETE";
  answers: Record<string, unknown>;
  removeFieldKeys: string[];
  operationId: string;
  correlationId: string;
  localValuesSnapshot: Record<string, unknown>;
};

type QueuedPersist = {
  status: "IN_PROGRESS" | "COMPLETE";
  resolve: (ok: boolean) => void;
};

function cloneValues(values: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(values)) as Record<string, unknown>;
}

function cloneUnknown<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function valuesEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return semanticEqual(a, b);
}

function hydrateFromOnboarding(
  onboarding: ProjectOnboardingState,
): Record<OnboardingSectionKey, SectionLocalState> {
  const next = {} as Record<OnboardingSectionKey, SectionLocalState>;
  for (const sectionKey of SECTION_ORDER) {
    const section = onboarding.sections.find((entry) => entry.sectionKey === sectionKey)!;
    const answers = onboarding.answers.filter((answer) => answer.sectionKey === sectionKey);
    const values: Record<string, unknown> = {};
    const savedKeys = new Set<string>();
    for (const answer of answers) {
      values[answer.fieldKey] = answer.value;
      savedKeys.add(answer.fieldKey);
    }
    next[sectionKey] = {
      status: section.status,
      version: section.version,
      values,
      savedValues: cloneValues(values),
      savedKeys,
      conflict: false,
      fieldError: null,
      revealHidden: false,
    };
  }
  return next;
}

function initialActiveSection(
  sections: ProjectOnboardingState["sections"],
): OnboardingSectionKey {
  for (const sectionKey of SECTION_ORDER) {
    const section = sections.find((entry) => entry.sectionKey === sectionKey)!;
    if (section.status !== "COMPLETE") {
      return sectionKey;
    }
  }
  return "REVIEW";
}

export function buildSavePayload(section: SectionLocalState): {
  answers: Record<string, unknown>;
  removeFieldKeys: string[];
  validationError: string | null;
} {
  const answers: Record<string, unknown> = {};
  const removeFieldKeys: string[] = [];
  let validationError: string | null = null;

  const allKeys = new Set([...Object.keys(section.values), ...section.savedKeys]);

  for (const fieldKey of allKeys) {
    const field = fieldByKey(fieldKey);
    if (!field) continue;
    const current = section.values[fieldKey];
    const hadSaved = section.savedKeys.has(fieldKey);
    const prepared = prepareAnswerForSave(field, current);

    if (prepared.kind === "error") {
      validationError = prepared.message;
      continue;
    }

    if (fieldKey === "business.name") {
      if (hadSaved && prepared.kind === "omit") {
        validationError =
          "Business name cannot be cleared. Enter a replacement name or restore the saved value.";
        continue;
      }
      if (
        prepared.kind === "value" &&
        !semanticEqual(prepared.value, section.savedValues[fieldKey])
      ) {
        answers[fieldKey] = prepared.value;
      }
      continue;
    }

    if (prepared.kind === "omit") {
      if (hadSaved && field.removable) {
        removeFieldKeys.push(fieldKey);
      }
      continue;
    }

    if (!semanticEqual(prepared.value, section.savedValues[fieldKey])) {
      answers[fieldKey] = prepared.value;
    }
  }

  return { answers, removeFieldKeys, validationError };
}

function isFieldVisible(
  field: OnboardingFieldUi,
  section: SectionLocalState,
  hasExistingWebsite: boolean | null,
): boolean {
  if (field.adaptive === "existing_site") {
    if (hasExistingWebsite === false && !section.savedKeys.has(field.fieldKey)) {
      return false;
    }
    if (hasExistingWebsite === false && section.savedKeys.has(field.fieldKey)) {
      return section.revealHidden;
    }
  }

  if (field.adaptive === "brand_existing_style") {
    const brandState = section.values["brand.current_state"];
    if (brandState === "starting fresh" && !section.savedKeys.has(field.fieldKey)) {
      return false;
    }
    if (brandState === "starting fresh" && section.savedKeys.has(field.fieldKey)) {
      return section.revealHidden;
    }
  }

  return true;
}

function formatAnswerValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (typeof value[0] === "string") return value.join(", ");
    return value
      .map((entry) =>
        entry && typeof entry === "object"
          ? Object.values(entry as Record<string, unknown>)
              .filter((part) => !isFieldValueEmpty(part))
              .join(" · ")
          : String(entry),
      )
      .filter(Boolean)
      .join("; ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, part]) => !isFieldValueEmpty(part))
      .map(([key, part]) => `${key}: ${formatAnswerValue(part)}`)
      .join("; ");
  }
  return String(value);
}

function preferStatus(
  a: "IN_PROGRESS" | "COMPLETE",
  b: "IN_PROGRESS" | "COMPLETE",
): "IN_PROGRESS" | "COMPLETE" {
  return a === "COMPLETE" || b === "COMPLETE" ? "COMPLETE" : "IN_PROGRESS";
}

type DeeperOnboardingFlowProps = {
  projectId: string;
  resume: ProjectResumeDetail;
  onboarding: ProjectOnboardingState;
  research: ResearchLoadState;
  debounceMs?: number;
};

export function DeeperOnboardingFlow({
  projectId,
  resume,
  onboarding,
  research: initialResearch,
  debounceMs = AUTOSAVE_DEBOUNCE_MS,
}: DeeperOnboardingFlowProps) {
  const router = useRouter();
  const [sections, setSections] = useState(() => hydrateFromOnboarding(onboarding));
  const [research, setResearch] = useState<ResearchLoadState>(initialResearch);
  const [authoritativeSyncBusy, setAuthoritativeSyncBusy] = useState(false);
  const [activeSection, setActiveSection] = useState<OnboardingSectionKey>(() =>
    initialActiveSection(onboarding.sections),
  );
  const [saveStatus, setSaveStatusState] = useState<SaveStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [finished, setFinished] = useState(
    () => onboarding.sections.every((section) => section.status === "COMPLETE"),
  );
  const lastRetryIntent = useRef<{
    sectionKey: OnboardingSectionKey;
    snapshot: SaveRequestSnapshot;
  } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionsRef = useRef(sections);
  const saveStatusRef = useRef<SaveStatus>("idle");
  const inFlightRef = useRef<Partial<Record<OnboardingSectionKey, Promise<boolean>>>>({});
  const queueRef = useRef<Partial<Record<OnboardingSectionKey, QueuedPersist[]>>>({});
  const drainingRef = useRef<Partial<Record<OnboardingSectionKey, boolean>>>({});

  const setSaveStatus = (next: SaveStatus) => {
    saveStatusRef.current = next;
    setSaveStatusState(next);
  };

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  const hasExistingWebsite = resume.intake?.hasExistingWebsite ?? null;

  const active = sections[activeSection];
  const dirty = !valuesEqual(active.values, active.savedValues);
  const onboardingInteractionLocked = active.conflict || authoritativeSyncBusy;

  const visibleFields = useMemo(() => {
    return fieldsForSection(activeSection).filter((field) =>
      isFieldVisible(field, sections[activeSection], hasExistingWebsite),
    );
  }, [activeSection, sections, hasExistingWebsite]);

  const clearTimer = () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  };

  const applySuccessfulSnapshot = (
    sectionKey: OnboardingSectionKey,
    snapshot: SaveRequestSnapshot,
    result: {
      status: OnboardingSectionStatus;
      version: number;
      updatedAnswerFieldKeys: string[];
      removedFieldKeys: string[];
    },
  ) => {
    setSections((current) => {
      const previous = current[sectionKey];
      const nextSavedValues = cloneValues(previous.savedValues);
      for (const [fieldKey, value] of Object.entries(snapshot.answers)) {
        nextSavedValues[fieldKey] = cloneUnknown(value);
      }
      for (const fieldKey of snapshot.removeFieldKeys) {
        delete nextSavedValues[fieldKey];
      }

      const nextSavedKeys = new Set(previous.savedKeys);
      for (const key of result.updatedAnswerFieldKeys) {
        nextSavedKeys.add(key);
      }
      for (const key of snapshot.removeFieldKeys) {
        nextSavedKeys.delete(key);
      }
      for (const key of result.removedFieldKeys) {
        nextSavedKeys.delete(key);
      }

      return {
        ...current,
        [sectionKey]: {
          ...previous,
          status: result.status,
          version: result.version,
          savedValues: nextSavedValues,
          savedKeys: nextSavedKeys,
          conflict: false,
          fieldError: null,
        },
      };
    });
  };

  const syncRefAfterSuccess = (
    sectionKey: OnboardingSectionKey,
    snapshot: SaveRequestSnapshot,
    result: {
      status: OnboardingSectionStatus;
      version: number;
      updatedAnswerFieldKeys: string[];
      removedFieldKeys: string[];
    },
  ) => {
    const synced = sectionsRef.current[sectionKey];
    const nextSavedValues = cloneValues(synced.savedValues);
    for (const [fieldKey, value] of Object.entries(snapshot.answers)) {
      nextSavedValues[fieldKey] = cloneUnknown(value);
    }
    for (const fieldKey of snapshot.removeFieldKeys) {
      delete nextSavedValues[fieldKey];
    }
    const nextSavedKeys = new Set(synced.savedKeys);
    for (const key of result.updatedAnswerFieldKeys) nextSavedKeys.add(key);
    for (const key of snapshot.removeFieldKeys) nextSavedKeys.delete(key);
    for (const key of result.removedFieldKeys) nextSavedKeys.delete(key);
    sectionsRef.current = {
      ...sectionsRef.current,
      [sectionKey]: {
        ...synced,
        status: result.status,
        version: result.version,
        savedValues: nextSavedValues,
        savedKeys: nextSavedKeys,
        conflict: false,
        fieldError: null,
      },
    };
  };

  const executeSave = async (
    sectionKey: OnboardingSectionKey,
    status: "IN_PROGRESS" | "COMPLETE",
  ): Promise<boolean> => {
    const section = sectionsRef.current[sectionKey];
    if (section.conflict) {
      return false;
    }

    const payload = buildSavePayload(section);
    if (payload.validationError) {
      setSections((current) => ({
        ...current,
        [sectionKey]: { ...current[sectionKey], fieldError: payload.validationError },
      }));
      setSaveStatus("error");
      setRetryable(false);
      setStatusMessage(payload.validationError);
      lastRetryIntent.current = null;
      return false;
    }

    const unchanged =
      Object.keys(payload.answers).length === 0 &&
      payload.removeFieldKeys.length === 0 &&
      !(status === "COMPLETE" && section.status !== "COMPLETE");

    if (unchanged && status !== "COMPLETE") {
      setSaveStatus("saved");
      setRetryable(false);
      setStatusMessage("Saved");
      return true;
    }

    if (unchanged && status === "COMPLETE" && section.status === "COMPLETE") {
      setSaveStatus("saved");
      setRetryable(false);
      return true;
    }

    const bodyKey = JSON.stringify({
      expectedVersion: section.version,
      status,
      answers: payload.answers,
      removeFieldKeys: payload.removeFieldKeys,
    });

    let operationId = crypto.randomUUID();
    let correlationId = crypto.randomUUID();
    const retry = lastRetryIntent.current;
    if (
      retry &&
      retry.sectionKey === sectionKey &&
      JSON.stringify({
        expectedVersion: retry.snapshot.expectedVersion,
        status: retry.snapshot.status,
        answers: retry.snapshot.answers,
        removeFieldKeys: retry.snapshot.removeFieldKeys,
      }) === bodyKey
    ) {
      operationId = retry.snapshot.operationId;
      correlationId = retry.snapshot.correlationId;
    }

    const snapshot: SaveRequestSnapshot = {
      sectionKey,
      expectedVersion: section.version,
      status,
      answers: cloneUnknown(payload.answers),
      removeFieldKeys: [...payload.removeFieldKeys],
      operationId,
      correlationId,
      localValuesSnapshot: cloneValues(section.values),
    };

    setSaveStatus("saving");
    setRetryable(false);
    setStatusMessage("Saving…");

    const result = await saveOnboardingSectionAction({
      projectId,
      sectionKey,
      operationId: snapshot.operationId,
      correlationId: snapshot.correlationId,
      expectedVersion: snapshot.expectedVersion,
      status: snapshot.status,
      answers: snapshot.answers,
      removeFieldKeys: snapshot.removeFieldKeys,
    });

    if (!result.ok) {
      if (result.category === "auth_required" || result.category === "session_expired") {
        lastRetryIntent.current = null;
        router.push(buildSignInPath(`/portal/projects/${projectId}/onboarding`));
        return false;
      }
      if (result.category === "stale_or_conflicting") {
        lastRetryIntent.current = null;
        setSections((current) => ({
          ...current,
          [sectionKey]: { ...current[sectionKey], conflict: true },
        }));
        setSaveStatus("conflict");
        setRetryable(false);
        setStatusMessage(result.message);
        return false;
      }
      if (result.category === "temporary_failure") {
        lastRetryIntent.current = { sectionKey, snapshot };
        setSaveStatus("error");
        setRetryable(true);
        setStatusMessage(result.message);
        return false;
      }
      lastRetryIntent.current = null;
      setSaveStatus("error");
      setRetryable(false);
      setStatusMessage(result.message);
      return false;
    }

    lastRetryIntent.current = null;
    applySuccessfulSnapshot(sectionKey, snapshot, result.data);
    syncRefAfterSuccess(sectionKey, snapshot, result.data);
    setSaveStatus("saved");
    setRetryable(false);
    setStatusMessage("Saved");
    return true;
  };

  const drainSection = async (sectionKey: OnboardingSectionKey) => {
    if (drainingRef.current[sectionKey]) return;
    drainingRef.current[sectionKey] = true;

    try {
      while (true) {
        const batch = queueRef.current[sectionKey] ?? [];
        queueRef.current[sectionKey] = [];

        let status: "IN_PROGRESS" | "COMPLETE" | null = null;
        if (batch.length > 0) {
          status = batch.reduce<"IN_PROGRESS" | "COMPLETE">(
            (current, item) => preferStatus(current, item.status),
            "IN_PROGRESS",
          );
        } else {
          const latest = sectionsRef.current[sectionKey];
          if (!latest.conflict && !valuesEqual(latest.values, latest.savedValues)) {
            status = latest.status === "COMPLETE" ? "COMPLETE" : "IN_PROGRESS";
          }
        }

        if (!status) break;

        const run = executeSave(sectionKey, status);
        inFlightRef.current[sectionKey] = run;
        const ok = await run;
        delete inFlightRef.current[sectionKey];

        for (const item of batch) {
          item.resolve(ok);
        }

        if (!ok) {
          const remaining = queueRef.current[sectionKey] ?? [];
          queueRef.current[sectionKey] = [];
          for (const item of remaining) item.resolve(false);
          break;
        }
      }
    } finally {
      drainingRef.current[sectionKey] = false;
      if ((queueRef.current[sectionKey] ?? []).length > 0) {
        void drainSection(sectionKey);
      }
    }
  };

  const persistSection = (
    sectionKey: OnboardingSectionKey,
    status: "IN_PROGRESS" | "COMPLETE",
  ): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const queue = queueRef.current[sectionKey] ?? [];
      queue.push({ status, resolve });
      queueRef.current[sectionKey] = queue;
      void drainSection(sectionKey);
    });
  };

  useEffect(() => {
    if (
      !dirty ||
      active.conflict ||
      saveStatus === "error" ||
      saveStatus === "conflict" ||
      Boolean(inFlightRef.current[activeSection]) ||
      drainingRef.current[activeSection]
    ) {
      return;
    }
    clearTimer();
    saveTimer.current = setTimeout(() => {
      if (inFlightRef.current[activeSection] || drainingRef.current[activeSection]) {
        return;
      }
      const section = sectionsRef.current[activeSection];
      const nextStatus = section.status === "COMPLETE" ? "COMPLETE" : "IN_PROGRESS";
      void persistSection(activeSection, nextStatus);
    }, debounceMs);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional debounce on edit snapshot
  }, [
    dirty,
    active.values,
    active.conflict,
    activeSection,
    debounceMs,
    projectId,
    saveStatus,
  ]);

  const updateField = (fieldKey: string, value: unknown) => {
    if (authoritativeSyncBusy) {
      return;
    }
    setSections((current) => {
      const nextSection = {
        ...current[activeSection],
        values: { ...current[activeSection].values, [fieldKey]: value },
        fieldError: null,
      };
      const next = {
        ...current,
        [activeSection]: nextSection,
      };
      sectionsRef.current = next;
      return next;
    });
    if (saveStatusRef.current === "saving") {
      return;
    }
    if (saveStatusRef.current === "error" || saveStatusRef.current === "conflict") {
      lastRetryIntent.current = null;
      setRetryable(false);
    }
    setSaveStatus("idle");
    setStatusMessage(null);
  };

  const flushAndNavigate = async (nextSection: OnboardingSectionKey) => {
    clearTimer();
    if (active.conflict || authoritativeSyncBusy) return;
    if (dirty || inFlightRef.current[activeSection] || drainingRef.current[activeSection]) {
      const nextStatus =
        sectionsRef.current[activeSection].status === "COMPLETE"
          ? "COMPLETE"
          : "IN_PROGRESS";
      const ok = await persistSection(activeSection, nextStatus);
      if (!ok) return;
      const latest = sectionsRef.current[activeSection];
      if (!valuesEqual(latest.values, latest.savedValues)) {
        const again = await persistSection(
          activeSection,
          latest.status === "COMPLETE" ? "COMPLETE" : "IN_PROGRESS",
        );
        if (!again) return;
      }
    }
    setActiveSection(nextSection);
  };

  const handleContinue = async () => {
    clearTimer();
    if (authoritativeSyncBusy || active.conflict) return;
    const ok = await persistSection(activeSection, "COMPLETE");
    if (!ok) return;
    const latest = sectionsRef.current[activeSection];
    if (!valuesEqual(latest.values, latest.savedValues) || latest.status !== "COMPLETE") {
      const again = await persistSection(activeSection, "COMPLETE");
      if (!again) return;
    }
    if (sectionsRef.current[activeSection].status !== "COMPLETE") {
      return;
    }
    const index = SECTION_ORDER.indexOf(activeSection);
    if (activeSection === "REVIEW") {
      setFinished(true);
      return;
    }
    setActiveSection(SECTION_ORDER[index + 1]!);
  };

  const handleReload = async () => {
    const result = await reloadProjectOnboardingAction(projectId);
    if (result.status === "reauth") {
      router.push(result.signInPath);
      return;
    }
    if (result.status !== "success") {
      setSaveStatus("error");
      setRetryable(false);
      setStatusMessage(result.status === "not_found" ? "Project not found." : result.message);
      return;
    }
    const next = hydrateFromOnboarding(result.onboarding);
    sectionsRef.current = next;
    setSections(next);
    setResearch(result.research);
    lastRetryIntent.current = null;
    setSaveStatus("saved");
    setRetryable(false);
    setStatusMessage("Reloaded saved version");
  };

  const flushBeforeReconcile = async (): Promise<boolean> => {
    clearTimer();
    const sectionKey = activeSection;
    const section = sectionsRef.current[sectionKey];
    if (section.conflict) {
      return false;
    }
    if (
      !valuesEqual(section.values, section.savedValues) ||
      inFlightRef.current[sectionKey] ||
      drainingRef.current[sectionKey]
    ) {
      const nextStatus = section.status === "COMPLETE" ? "COMPLETE" : "IN_PROGRESS";
      const ok = await persistSection(sectionKey, nextStatus);
      if (!ok) return false;
      const latest = sectionsRef.current[sectionKey];
      if (!valuesEqual(latest.values, latest.savedValues)) {
        const again = await persistSection(
          sectionKey,
          latest.status === "COMPLETE" ? "COMPLETE" : "IN_PROGRESS",
        );
        if (!again) return false;
      }
    }
    return !sectionsRef.current[sectionKey].conflict;
  };

  const handleAuthoritativeState = (input: {
    onboarding?: ProjectOnboardingState;
    research: ResearchLoadState;
  }) => {
    if (input.onboarding) {
      const next = hydrateFromOnboarding(input.onboarding);
      sectionsRef.current = next;
      setSections(next);
      lastRetryIntent.current = null;
    }
    setResearch(input.research);
  };

  const handleRetry = async () => {
    if (authoritativeSyncBusy) return;
    const intent = lastRetryIntent.current;
    if (!intent || intent.sectionKey !== activeSection) return;
    await persistSection(activeSection, intent.snapshot.status);
  };

  return (
    <div className="page-stack deeper-onboarding">
      <header className="onboarding-header">
        <h1>Deeper onboarding</h1>
        <p className="muted">{resume.project.projectName}</p>
      </header>

      <section className="panel">
        <h2>What you&apos;ve already told us</h2>
        {resume.intake ? (
          <dl className="review-list">
            <div>
              <dt>Existing website</dt>
              <dd>{resume.intake.hasExistingWebsite ? "Yes" : "No"}</dd>
            </div>
            {resume.intake.existingWebsiteUrl ? (
              <div>
                <dt>Current website URL</dt>
                <dd>{resume.intake.existingWebsiteUrl}</dd>
              </div>
            ) : null}
            <div>
              <dt>Business description</dt>
              <dd>{resume.intake.businessDescription}</dd>
            </div>
            <div>
              <dt>Outcome answer</dt>
              <dd>{resume.intake.thirdAnswer}</dd>
            </div>
          </dl>
        ) : (
          <p className="muted">No first-three answers are available.</p>
        )}
      </section>

      <nav className="stage-progress" aria-label="Onboarding stages">
        {SECTION_ORDER.map((sectionKey) => {
          const section = sections[sectionKey];
          return (
            <button
              key={sectionKey}
              type="button"
              className={
                sectionKey === activeSection
                  ? "stage-chip active"
                  : "stage-chip secondary"
              }
              aria-current={sectionKey === activeSection ? "step" : undefined}
              disabled={onboardingInteractionLocked}
              onClick={() => {
                void flushAndNavigate(sectionKey);
              }}
            >
              <span>{SECTION_LABELS[sectionKey]}</span>
              <span className="muted">
                {section.status === "NOT_STARTED"
                  ? "Not started"
                  : section.status === "IN_PROGRESS"
                    ? "In progress"
                    : "Complete"}
              </span>
            </button>
          );
        })}
      </nav>

      <ResearchFindingsPanel
        projectId={projectId}
        research={research}
        activeSection={activeSection}
        getSectionVersion={(sectionKey) => sectionsRef.current[sectionKey].version}
        flushBeforeReconcile={flushBeforeReconcile}
        onAuthoritativeState={handleAuthoritativeState}
        onAuthoritativeSyncBusyChange={setAuthoritativeSyncBusy}
        onNotice={(message, tone) => {
          if (tone === "error") {
            setSaveStatus("error");
            setRetryable(false);
          } else if (tone === "success") {
            setSaveStatus("saved");
            setRetryable(false);
          } else {
            setSaveStatus("idle");
            setRetryable(false);
          }
          setStatusMessage(message);
        }}
      />

      {active.conflict ? (
        <div className="panel form-error" role="alert">
          <p>
            This project was updated elsewhere. Your unsaved edits for this stage are still
            here, but saving is paused until you reload the saved version.
          </p>
          <button
            type="button"
            disabled={authoritativeSyncBusy}
            onClick={() => void handleReload()}
          >
            Reload saved version
          </button>
        </div>
      ) : null}

      {statusMessage ? (
        <p
          className={
            saveStatus === "saved"
              ? "form-success"
              : saveStatus === "error" || saveStatus === "conflict"
                ? "form-error"
                : "muted"
          }
          aria-live="polite"
        >
          {statusMessage}
        </p>
      ) : null}

      {finished && activeSection === "REVIEW" && active.status === "COMPLETE" ? (
        <section className="panel">
          <h2>Onboarding answers saved</h2>
          <p>
            Your deeper onboarding answers are saved. You can return to the project or portal
            any time.
          </p>
          <div className="button-row">
            <Link className="button-link" href={`/portal/projects/${projectId}`}>
              Back to project
            </Link>
            <Link className="button-link secondary" href="/portal">
              Back to portal
            </Link>
          </div>
        </section>
      ) : null}

      {activeSection === "REVIEW" ? (
        <section className="panel">
          <h2>Review</h2>
          {SECTION_ORDER.filter((key) => key !== "REVIEW").map((sectionKey) => (
            <div key={sectionKey} className="review-section">
              <div className="button-row">
                <h3>{SECTION_LABELS[sectionKey]}</h3>
                <button
                  type="button"
                  className="secondary"
                  disabled={onboardingInteractionLocked}
                  onClick={() => void flushAndNavigate(sectionKey)}
                >
                  Edit
                </button>
              </div>
              <dl className="review-list">
                {fieldsForSection(sectionKey).map((field) => {
                  const value = sections[sectionKey].values[field.fieldKey];
                  if (
                    isFieldValueEmpty(value) &&
                    !sections[sectionKey].savedKeys.has(field.fieldKey)
                  ) {
                    return null;
                  }
                  return (
                    <div key={field.fieldKey}>
                      <dt>{field.label}</dt>
                      <dd>{formatAnswerValue(value)}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
          {fieldsForSection("REVIEW").map((field) => (
            <OnboardingFieldEditor
              key={field.fieldKey}
              field={field}
              value={active.values[field.fieldKey]}
              disabled={onboardingInteractionLocked}
              onChange={(next) => updateField(field.fieldKey, next)}
            />
          ))}
        </section>
      ) : (
        <section className="panel">
          <h2>{SECTION_LABELS[activeSection]}</h2>
          <p className="muted">All questions are optional. Continue when you are ready.</p>
          {(hasExistingWebsite === false &&
            fieldsForSection(activeSection).some((field) => field.adaptive === "existing_site") &&
            sections[activeSection].savedKeys.has("goals.existing_site_keep_change") &&
            !sections[activeSection].revealHidden) ||
          (active.values["brand.current_state"] === "starting fresh" &&
            sections[activeSection].savedKeys.has("brand.existing_colors_or_style") &&
            !sections[activeSection].revealHidden) ? (
            <button
              type="button"
              className="secondary"
              disabled={onboardingInteractionLocked}
              onClick={() =>
                setSections((current) => ({
                  ...current,
                  [activeSection]: {
                    ...current[activeSection],
                    revealHidden: true,
                  },
                }))
              }
            >
              Show previously saved answers that are currently hidden
            </button>
          ) : null}
          {visibleFields.map((field) => (
            <OnboardingFieldEditor
              key={field.fieldKey}
              field={field}
              value={active.values[field.fieldKey]}
              disabled={onboardingInteractionLocked}
              onChange={(next) => updateField(field.fieldKey, next)}
            />
          ))}
          {active.fieldError ? <p className="form-error">{active.fieldError}</p> : null}
        </section>
      )}

      <div className="button-row">
        <button
          type="button"
          className="secondary"
          disabled={
            SECTION_ORDER.indexOf(activeSection) === 0 || onboardingInteractionLocked
          }
          onClick={() => {
            const index = SECTION_ORDER.indexOf(activeSection);
            if (index > 0) {
              void flushAndNavigate(SECTION_ORDER[index - 1]!);
            }
          }}
        >
          Back
        </button>
        {retryable ? (
          <button
            type="button"
            className="secondary"
            disabled={onboardingInteractionLocked}
            onClick={() => void handleRetry()}
          >
            Retry save
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void handleContinue()}
          disabled={onboardingInteractionLocked}
        >
          {activeSection === "REVIEW" ? "Finish onboarding" : "Continue"}
        </button>
      </div>
    </div>
  );
}
