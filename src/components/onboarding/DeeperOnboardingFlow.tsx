"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { OnboardingFieldEditor } from "@/components/onboarding/FieldEditors";
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
} from "@/lib/onboarding/actions";
import {
  AUTOSAVE_DEBOUNCE_MS,
  SECTION_LABELS,
  SECTION_ORDER,
  fieldByKey,
  fieldsForSection,
  isFieldValueEmpty,
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

function cloneValues(values: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(values)) as Record<string, unknown>;
}

function valuesEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
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

function buildSavePayload(section: SectionLocalState): {
  answers: Record<string, unknown>;
  removeFieldKeys: string[];
  businessNameError: string | null;
} {
  const answers: Record<string, unknown> = {};
  const removeFieldKeys: string[] = [];
  let businessNameError: string | null = null;

  const allKeys = new Set([
    ...Object.keys(section.values),
    ...section.savedKeys,
  ]);

  for (const fieldKey of allKeys) {
    const field = fieldByKey(fieldKey);
    if (!field) continue;
    const current = section.values[fieldKey];
    const hadSaved = section.savedKeys.has(fieldKey);
    const empty = isFieldValueEmpty(current);

    if (fieldKey === "business.name") {
      if (hadSaved && empty) {
        businessNameError =
          "Business name cannot be cleared. Enter a replacement name or restore the saved value.";
        continue;
      }
      if (!empty && current !== section.savedValues[fieldKey]) {
        answers[fieldKey] = typeof current === "string" ? current.trim() : current;
      }
      continue;
    }

    if (empty) {
      if (hadSaved && field.removable) {
        removeFieldKeys.push(fieldKey);
      }
      continue;
    }

    if (current !== section.savedValues[fieldKey]) {
      answers[fieldKey] = current;
    }
  }

  return { answers, removeFieldKeys, businessNameError };
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

type DeeperOnboardingFlowProps = {
  projectId: string;
  resume: ProjectResumeDetail;
  onboarding: ProjectOnboardingState;
  debounceMs?: number;
};

export function DeeperOnboardingFlow({
  projectId,
  resume,
  onboarding,
  debounceMs = AUTOSAVE_DEBOUNCE_MS,
}: DeeperOnboardingFlowProps) {
  const router = useRouter();
  const [sections, setSections] = useState(() => hydrateFromOnboarding(onboarding));
  const [activeSection, setActiveSection] = useState<OnboardingSectionKey>(() =>
    initialActiveSection(onboarding.sections),
  );
  const [saveStatus, setSaveStatusState] = useState<SaveStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [finished, setFinished] = useState(
    () => onboarding.sections.every((section) => section.status === "COMPLETE"),
  );
  const pendingIntent = useRef<{
    operationId: string;
    correlationId: string;
    bodyKey: string;
  } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionsRef = useRef(sections);
  const saveStatusRef = useRef<SaveStatus>("idle");

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

  const persistSection = async (
    sectionKey: OnboardingSectionKey,
    status: "IN_PROGRESS" | "COMPLETE",
    options?: { force?: boolean },
  ): Promise<boolean> => {
    const section = sectionsRef.current[sectionKey];
    if (section.conflict && !options?.force) {
      return false;
    }

    const payload = buildSavePayload(section);
    if (payload.businessNameError) {
      setSections((current) => ({
        ...current,
        [sectionKey]: { ...current[sectionKey], fieldError: payload.businessNameError },
      }));
      setSaveStatus("error");
      setStatusMessage(payload.businessNameError);
      return false;
    }

    const unchanged =
      Object.keys(payload.answers).length === 0 &&
      payload.removeFieldKeys.length === 0 &&
      !(status === "COMPLETE" && section.status !== "COMPLETE");

    if (unchanged && status !== "COMPLETE") {
      setSaveStatus("saved");
      setStatusMessage("Saved");
      return true;
    }

    if (unchanged && status === "COMPLETE" && section.status === "COMPLETE") {
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
    if (
      pendingIntent.current &&
      pendingIntent.current.bodyKey === bodyKey &&
      saveStatusRef.current === "error"
    ) {
      operationId = pendingIntent.current.operationId;
      correlationId = pendingIntent.current.correlationId;
    } else {
      pendingIntent.current = { operationId, correlationId, bodyKey };
    }

    setSaveStatus("saving");
    setStatusMessage("Saving…");

    const result = await saveOnboardingSectionAction({
      projectId,
      sectionKey,
      operationId,
      correlationId,
      expectedVersion: section.version,
      status,
      answers: payload.answers,
      removeFieldKeys: payload.removeFieldKeys,
    });

    if (!result.ok) {
      if (result.category === "auth_required" || result.category === "session_expired") {
        router.push(buildSignInPath(`/portal/projects/${projectId}/onboarding`));
        return false;
      }
      if (result.category === "stale_or_conflicting") {
        setSections((current) => ({
          ...current,
          [sectionKey]: { ...current[sectionKey], conflict: true },
        }));
        setSaveStatus("conflict");
        setStatusMessage(result.message);
        return false;
      }
      setSaveStatus("error");
      setStatusMessage(result.message);
      return false;
    }

    setSections((current) => {
      const previous = current[sectionKey];
      const nextValues = cloneValues(previous.values);
      for (const key of result.data.removedFieldKeys) {
        delete nextValues[key];
      }
      const nextSavedKeys = new Set(previous.savedKeys);
      for (const key of result.data.updatedAnswerFieldKeys) {
        nextSavedKeys.add(key);
      }
      for (const key of result.data.removedFieldKeys) {
        nextSavedKeys.delete(key);
      }
      return {
        ...current,
        [sectionKey]: {
          ...previous,
          status: result.data.status,
          version: result.data.version,
          values: nextValues,
          savedValues: cloneValues(nextValues),
          savedKeys: nextSavedKeys,
          conflict: false,
          fieldError: null,
        },
      };
    });
    pendingIntent.current = null;
    setSaveStatus("saved");
    setStatusMessage("Saved");
    return true;
  };

  useEffect(() => {
    if (
      !dirty ||
      active.conflict ||
      saveStatus === "error" ||
      saveStatus === "conflict" ||
      saveStatus === "saving"
    ) {
      return;
    }
    clearTimer();
    saveTimer.current = setTimeout(() => {
      const section = sectionsRef.current[activeSection];
      const nextStatus =
        section.status === "NOT_STARTED"
          ? "IN_PROGRESS"
          : section.status === "COMPLETE"
            ? "COMPLETE"
            : "IN_PROGRESS";
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
    setSections((current) => ({
      ...current,
      [activeSection]: {
        ...current[activeSection],
        values: { ...current[activeSection].values, [fieldKey]: value },
        fieldError: null,
      },
    }));
    setSaveStatus("idle");
    setStatusMessage(null);
  };

  const flushAndNavigate = async (nextSection: OnboardingSectionKey) => {
    clearTimer();
    if (dirty && !active.conflict) {
      const nextStatus =
        active.status === "NOT_STARTED"
          ? "IN_PROGRESS"
          : active.status === "COMPLETE"
            ? "COMPLETE"
            : "IN_PROGRESS";
      const ok = await persistSection(activeSection, nextStatus);
      if (!ok) return;
    }
    setActiveSection(nextSection);
  };

  const handleContinue = async () => {
    clearTimer();
    const ok = await persistSection(activeSection, "COMPLETE");
    if (!ok) return;
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
      setStatusMessage(result.status === "not_found" ? "Project not found." : result.message);
      return;
    }
    setSections(hydrateFromOnboarding(result.onboarding));
    setSaveStatus("saved");
    setStatusMessage("Reloaded saved version");
  };

  const handleRetry = async () => {
    let nextStatus: "IN_PROGRESS" | "COMPLETE" =
      active.status === "COMPLETE" ? "COMPLETE" : "IN_PROGRESS";
    if (pendingIntent.current) {
      try {
        const parsed = JSON.parse(pendingIntent.current.bodyKey) as {
          status?: string;
        };
        if (parsed.status === "COMPLETE" || parsed.status === "IN_PROGRESS") {
          nextStatus = parsed.status;
        }
      } catch {
        // Fall back to section-derived status.
      }
    }
    await persistSection(activeSection, nextStatus, { force: false });
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

      {active.conflict ? (
        <div className="panel form-error" role="alert">
          <p>
            This project was updated elsewhere. Your unsaved edits for this stage are still
            here, but saving is paused until you reload the saved version.
          </p>
          <button type="button" onClick={() => void handleReload()}>
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
                  onClick={() => void flushAndNavigate(sectionKey)}
                >
                  Edit
                </button>
              </div>
              <dl className="review-list">
                {fieldsForSection(sectionKey).map((field) => {
                  const value = sections[sectionKey].values[field.fieldKey];
                  if (isFieldValueEmpty(value) && !sections[sectionKey].savedKeys.has(field.fieldKey)) {
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
              disabled={active.conflict}
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
              disabled={active.conflict}
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
          disabled={SECTION_ORDER.indexOf(activeSection) === 0}
          onClick={() => {
            const index = SECTION_ORDER.indexOf(activeSection);
            if (index > 0) {
              void flushAndNavigate(SECTION_ORDER[index - 1]!);
            }
          }}
        >
          Back
        </button>
        {saveStatus === "error" ? (
          <button type="button" className="secondary" onClick={() => void handleRetry()}>
            Retry save
          </button>
        ) : null}
        <button type="button" onClick={() => void handleContinue()} disabled={active.conflict}>
          {activeSection === "REVIEW" ? "Finish onboarding" : "Continue"}
        </button>
      </div>
    </div>
  );
}
