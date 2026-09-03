"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { clearPreAccountDraft, loadOrCreateDraft } from "@/lib/draft/storage";
import { validateDraftAnswersForSubmit } from "@/lib/draft/schema";
import type { ProjectResumeSummary } from "@/lib/factory/contract";
import { submitProjectStartAction } from "@/lib/projects/actions";

type PortalResumePanelProps = {
  projects: ProjectResumeSummary[];
  errorMessage?: string;
};

export function PortalResumePanel({ projects, errorMessage }: PortalResumePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(errorMessage ?? null);
  const [submitting, setSubmitting] = useState(false);

  async function continueDraft() {
    const draft = loadOrCreateDraft();
    const validationError = validateDraftAnswersForSubmit(draft.answers);
    if (validationError) {
      setMessage(validationError);
      router.push("/start");
      return;
    }

    setSubmitting(true);
    const result = await submitProjectStartAction({
      operationId: draft.operationId,
      answers: draft.answers,
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
    const draft = typeof window !== "undefined" ? loadOrCreateDraft() : null;
    const hasCompleteDraft =
      draft && validateDraftAnswersForSubmit(draft.answers) === null;

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
