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
    expect(parseStoredDraft({ schemaVersion: 99, operationId: "x" })).toBeNull();
    expect(
      parseStoredDraft({
        schemaVersion: 1,
        operationId: "00000000-0000-4000-8000-000000000001",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000).toISOString(),
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
