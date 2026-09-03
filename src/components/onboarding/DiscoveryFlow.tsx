"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useSyncExternalStore, useState } from "react";

import { buildSignInPath } from "@/lib/auth/safe-return-path";
import {
  getDiscoveryDraftRawSnapshot,
  parseDiscoveryDraftRaw,
  subscribeDiscoveryDraft,
} from "@/lib/draft/discovery-draft-store";
import {
  clearPreAccountDraft,
  saveDraftAnswers,
} from "@/lib/draft/storage";
import {
  getThirdQuestionLabel,
  validateDraftAnswersForSubmit,
  type PreAccountDraft,
} from "@/lib/draft/schema";
import { submitProjectStartAction } from "@/lib/projects/actions";

type Step = 1 | 2 | 3 | "review";

function useDiscoveryDraft(): PreAccountDraft | null {
  const draftRaw = useSyncExternalStore(
    subscribeDiscoveryDraft,
    getDiscoveryDraftRawSnapshot,
    () => null,
  );

  return useMemo(() => parseDiscoveryDraftRaw(draftRaw), [draftRaw]);
}

export function DiscoveryFlow() {
  const router = useRouter();
  const draft = useDiscoveryDraft();
  const [step, setStep] = useState<Step>(1);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const thirdQuestion = useMemo(
    () => getThirdQuestionLabel(draft?.answers.hasExistingWebsite ?? null),
    [draft?.answers.hasExistingWebsite],
  );

  if (!draft) {
    return <p className="muted">Loading your saved answers…</p>;
  }

  async function persistAnswers(updates: Partial<PreAccountDraft["answers"]>) {
    const next = saveDraftAnswers(updates);
    return next;
  }

  async function handleSaveProject() {
    if (!draft) {
      return;
    }

    const validationError = validateDraftAnswersForSubmit(draft.answers);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const result = await submitProjectStartAction({
      operationId: draft.operationId,
      answers: draft.answers,
    });

    setSubmitting(false);

    if (!result.ok) {
      if (result.category === "auth_required" || result.category === "session_expired") {
        setMessage(result.message);
        router.push(buildSignInPath("/start"));
        return;
      }

      setMessage(result.message);
      return;
    }

    clearPreAccountDraft();
    router.push(`/portal/projects/${result.projectId}`);
  }

  return (
    <div className="discovery-flow">
      {step === 1 ? (
        <section className="panel">
          <h2>Do you currently have a website?</h2>
          <div className="choice-row">
            <button
              type="button"
              className={draft.answers.hasExistingWebsite === true ? "active" : ""}
              onClick={() => void persistAnswers({ hasExistingWebsite: true })}
            >
              Yes
            </button>
            <button
              type="button"
              className={draft.answers.hasExistingWebsite === false ? "active" : ""}
              onClick={() =>
                void persistAnswers({
                  hasExistingWebsite: false,
                  existingWebsiteUrl: null,
                })
              }
            >
              No
            </button>
          </div>
          {draft.answers.hasExistingWebsite ? (
            <label>
              Current website URL
              <input
                type="url"
                value={draft.answers.existingWebsiteUrl ?? ""}
                onChange={(event) =>
                  void persistAnswers({ existingWebsiteUrl: event.target.value })
                }
                placeholder="https://example.com"
              />
            </label>
          ) : null}
          <button type="button" onClick={() => setStep(2)}>
            Continue
          </button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="panel">
          <h2>Tell us about your business</h2>
          <label>
            Business description
            <textarea
              rows={5}
              value={draft.answers.businessDescription}
              onChange={(event) =>
                void persistAnswers({ businessDescription: event.target.value })
              }
              placeholder="Describe your business in your own words."
            />
          </label>
          <p className="muted">
            Public business links such as Instagram or Yelp are deferred to a later
            onboarding step and are not collected in B1-P1.
          </p>
          <div className="button-row">
            <button type="button" onClick={() => setStep(1)}>
              Back
            </button>
            <button type="button" onClick={() => setStep(3)}>
              Continue
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="panel">
          <h2>{thirdQuestion}</h2>
          <label>
            Your answer
            <textarea
              rows={4}
              value={draft.answers.thirdAnswer}
              onChange={(event) => void persistAnswers({ thirdAnswer: event.target.value })}
            />
          </label>
          <div className="button-row">
            <button type="button" onClick={() => setStep(2)}>
              Back
            </button>
            <button type="button" onClick={() => setStep("review")}>
              Review
            </button>
          </div>
        </section>
      ) : null}

      {step === "review" ? (
        <section className="panel">
          <h2>Review your answers</h2>
          <dl className="review-list">
            <div>
              <dt>Existing website</dt>
              <dd>{draft.answers.hasExistingWebsite ? "Yes" : "No"}</dd>
            </div>
            {draft.answers.hasExistingWebsite ? (
              <div>
                <dt>Current website URL</dt>
                <dd>{draft.answers.existingWebsiteUrl}</dd>
              </div>
            ) : null}
            <div>
              <dt>Business description</dt>
              <dd>{draft.answers.businessDescription}</dd>
            </div>
            <div>
              <dt>Outcome answer</dt>
              <dd>{draft.answers.thirdAnswer}</dd>
            </div>
          </dl>
          {message ? <p className="form-error">{message}</p> : null}
          <div className="button-row">
            <button type="button" onClick={() => setStep(3)}>
              Back
            </button>
            <Link href="/sign-up?next=/start" className="button-link">
              Create account
            </Link>
            <Link href="/sign-in?next=/start" className="button-link secondary">
              Sign in
            </Link>
            <button type="button" disabled={submitting} onClick={() => void handleSaveProject()}>
              {submitting ? "Saving…" : "Save project"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
