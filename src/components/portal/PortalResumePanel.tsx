"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore, useMemo, useState } from "react";

import {
  clearPreAccountDraft,
  readPreAccountDraft,
  subscribePreAccountDraft,
} from "@/lib/draft/storage";
import {
  parseStoredDraft,
  validateDraftAnswersForSubmit,
} from "@/lib/draft/schema";
import { DRAFT_STORAGE_KEY } from "@/lib/draft/schema";
import type { ProjectResumeSummary } from "@/lib/factory/contract";
import { submitProjectStartAction } from "@/lib/projects/actions";

type PortalResumePanelProps = {
  projects: ProjectResumeSummary[];
};

function getDraftSnapshot(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(DRAFT_STORAGE_KEY);
}

function usePreAccountDraft() {
  const draftRaw = useSyncExternalStore(
    subscribePreAccountDraft,
    getDraftSnapshot,
    () => null,
  );

  return useMemo(() => {
    if (!draftRaw) {
      return null;
    }

    try {
      return parseStoredDraft(JSON.parse(draftRaw));
    } catch {
      return null;
    }
  }, [draftRaw]);
}

function useClientHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function PortalResumePanel({ projects }: PortalResumePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const draft = usePreAccountDraft();
  const hydrated = useClientHydrated();

  async function continueDraft() {
    const existing = readPreAccountDraft();
    if (!existing) {
      setMessage("Your saved request is no longer available. Start again.");
      router.push("/start");
      return;
    }

    const validationError = validateDraftAnswersForSubmit(existing.answers);
    if (validationError) {
      setMessage(validationError);
      router.push("/start");
      return;
    }

    setSubmitting(true);
    const result = await submitProjectStartAction({
      operationId: existing.operationId,
      answers: existing.answers,
    });
    setSubmitting(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    clearPreAccountDraft();
    router.push(`/portal/projects/${result.projectId}`);
  }

  if (projects.length === 0) {
    const hasCompleteDraft =
      hydrated && draft !== null && validateDraftAnswersForSubmit(draft.answers) === null;
    const hasIncompleteDraft =
      hydrated && draft !== null && validateDraftAnswersForSubmit(draft.answers) !== null;

    return (
      <section className="panel">
        <h2>No projects yet</h2>
        {hasCompleteDraft ? (
          <>
            <p>You have a saved website request ready to submit.</p>
            {message ? <p className="form-error">{message}</p> : null}
            <button type="button" disabled={submitting} onClick={() => void continueDraft()}>
              {submitting ? "Saving…" : "Continue saved request"}
            </button>
          </>
        ) : hasIncompleteDraft ? (
          <>
            <p>You have an in-progress website request in this browser.</p>
            {message ? <p className="form-error">{message}</p> : null}
            <Link href="/start" className="button-link">
              Continue editing request
            </Link>
          </>
        ) : (
          <>
            <p>Start the website process to create your first project.</p>
            <Link href="/start" className="button-link">
              Start website process
            </Link>
          </>
        )}
      </section>
    );
  }

  if (projects.length === 1) {
    const project = projects[0]!;
    return (
      <section className="panel">
        <h2>Continue your project</h2>
        <p>{project.projectName}</p>
        <Link href={`/portal/projects/${project.projectId}`} className="button-link">
          Continue project
        </Link>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Your projects</h2>
      {message ? <p className="form-error">{message}</p> : null}
      <ul className="project-list">
        {projects.map((project) => (
          <li key={project.projectId}>
            <Link href={`/portal/projects/${project.projectId}`}>
              {project.projectName}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
