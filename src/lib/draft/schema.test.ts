import { describe, expect, it } from "vitest";

import {
  DRAFT_RETENTION_MS,
  createDraft,
  getThirdQuestionLabel,
  isDraftExpired,
  parseStoredDraft,
  updateDraftAnswers,
  validateDraftAnswersForSubmit,
} from "./schema";

const VALID_OPERATION_ID = "00000000-0000-4000-8000-000000000001";

function buildDraft(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    schemaVersion: 1,
    operationId: VALID_OPERATION_ID,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + DRAFT_RETENTION_MS).toISOString(),
    answers: {
      hasExistingWebsite: false,
      existingWebsiteUrl: null,
      businessDescription: "test",
      thirdAnswer: "goal",
    },
    ...overrides,
  };
}

describe("pre-account draft schema", () => {
  it("creates a draft once with stable operationId until explicitly recreated", () => {
    const draft = createDraft(1_000);
    const updated = updateDraftAnswers(draft, { businessDescription: " Bakery " });

    expect(updated.operationId).toBe(draft.operationId);
    expect(updated.answers.businessDescription).toBe(" Bakery ");
  });

  it("rejects expired drafts locally", () => {
    const draft = createDraft(0);
    expect(isDraftExpired(draft, DRAFT_RETENTION_MS + 1)).toBe(true);
    expect(parseStoredDraft(draft, DRAFT_RETENTION_MS + 1)).toBeNull();
  });

  it("ignores unknown schema versions and forbidden fields", () => {
    expect(parseStoredDraft({ schemaVersion: 99, operationId: VALID_OPERATION_ID })).toBeNull();
    expect(
      parseStoredDraft({
        ...buildDraft(),
        answers: {
          hasExistingWebsite: false,
          existingWebsiteUrl: null,
          businessDescription: "test",
          thirdAnswer: "goal",
          accessToken: "secret",
        },
      }),
    ).toBeNull();
  });

  it("discards malformed nested answer types and invalid timestamps", () => {
    expect(
      parseStoredDraft({
        ...buildDraft(),
        answers: {
          hasExistingWebsite: "yes",
          existingWebsiteUrl: null,
          businessDescription: "test",
          thirdAnswer: "goal",
        },
      }),
    ).toBeNull();

    expect(
      parseStoredDraft({
        ...buildDraft(),
        createdAt: "not-a-date",
      }),
    ).toBeNull();

    expect(
      parseStoredDraft({
        ...buildDraft(),
        operationId: "not-a-uuid",
      }),
    ).toBeNull();
  });

  it("validates Q1 URL conditionally and preserves exact answer content", () => {
    const answers = {
      hasExistingWebsite: true,
      existingWebsiteUrl: " https://example.com ",
      businessDescription: "  Neighborhood bakery ",
      thirdAnswer: "  More online orders ",
    };

    expect(validateDraftAnswersForSubmit(answers)).toBeNull();
    expect(answers.existingWebsiteUrl).toBe(" https://example.com ");
    expect(answers.businessDescription).toBe("  Neighborhood bakery ");
  });

  it("changes Q3 label based on Q1 branch", () => {
    expect(getThirdQuestionLabel(true)).toContain("do better");
    expect(getThirdQuestionLabel(false)).toContain("accomplish");
  });
});
