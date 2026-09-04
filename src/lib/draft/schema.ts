import { z } from "zod";

export const DRAFT_SCHEMA_VERSION = 1 as const;
export const DRAFT_RETENTION_MS = 24 * 60 * 60 * 1000;
export const DRAFT_STORAGE_KEY = "fpdesigner.preAccountDraft.v1";

export type PreAccountDraftAnswers = {
  hasExistingWebsite: boolean | null;
  existingWebsiteUrl: string | null;
  businessDescription: string;
  thirdAnswer: string;
};

export type PreAccountDraft = {
  schemaVersion: typeof DRAFT_SCHEMA_VERSION;
  operationId: string;
  createdAt: string;
  expiresAt: string;
  answers: PreAccountDraftAnswers;
};

export const EMPTY_DRAFT_ANSWERS: PreAccountDraftAnswers = {
  hasExistingWebsite: null,
  existingWebsiteUrl: null,
  businessDescription: "",
  thirdAnswer: "",
};

const isoTimestampSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid timestamp",
  });

export const preAccountDraftAnswersSchema = z.object({
  hasExistingWebsite: z.union([z.boolean(), z.null()]),
  existingWebsiteUrl: z.union([z.string(), z.null()]),
  businessDescription: z.string(),
  thirdAnswer: z.string(),
});

export const preAccountDraftSchema = z.object({
  schemaVersion: z.literal(DRAFT_SCHEMA_VERSION),
  operationId: z.string().uuid(),
  createdAt: isoTimestampSchema,
  expiresAt: isoTimestampSchema,
  answers: preAccountDraftAnswersSchema,
});

const FORBIDDEN_DRAFT_KEYS = new Set([
  "accessToken",
  "refreshToken",
  "password",
  "session",
  "customerId",
  "businessId",
  "websiteId",
  "projectId",
  "targetCustomerId",
]);

export function createOperationId(): string {
  return crypto.randomUUID();
}

export function createDraft(now = Date.now()): PreAccountDraft {
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(now + DRAFT_RETENTION_MS).toISOString();

  return {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    operationId: createOperationId(),
    createdAt,
    expiresAt,
    answers: { ...EMPTY_DRAFT_ANSWERS },
  };
}

export function isDraftExpired(draft: PreAccountDraft, now = Date.now()): boolean {
  return Date.parse(draft.expiresAt) <= now;
}

export function assertDraftHasNoForbiddenFields(value: unknown): void {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_DRAFT_KEYS.has(key)) {
      throw new Error(`Forbidden draft field: ${key}`);
    }
    assertDraftHasNoForbiddenFields(nested);
  }
}

export function validateDraftAnswersForSubmit(answers: PreAccountDraftAnswers): string | null {
  if (answers.hasExistingWebsite === null) {
    return "Please answer whether you currently have a website.";
  }

  if (answers.hasExistingWebsite && !answers.existingWebsiteUrl?.trim()) {
    return "Please provide your current website URL.";
  }

  if (!answers.hasExistingWebsite && answers.existingWebsiteUrl?.trim()) {
    return "Remove the website URL when you do not have an existing website.";
  }

  if (!answers.businessDescription.trim()) {
    return "Please tell us about your business.";
  }

  if (!answers.thirdAnswer.trim()) {
    return "Please answer the outcome question.";
  }

  return null;
}

export function getThirdQuestionLabel(hasExistingWebsite: boolean | null): string {
  if (hasExistingWebsite === true) {
    return "What would you like your new website to do better?";
  }

  if (hasExistingWebsite === false) {
    return "What do you need your website to help your business accomplish?";
  }

  return "What outcome are you looking for from your website?";
}

export function parseStoredDraft(raw: unknown, now = Date.now()): PreAccountDraft | null {
  try {
    assertDraftHasNoForbiddenFields(raw);
  } catch {
    return null;
  }

  const parsed = preAccountDraftSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }

  if (isDraftExpired(parsed.data, now)) {
    return null;
  }

  return parsed.data;
}

export function updateDraftAnswers(
  draft: PreAccountDraft,
  updates: Partial<PreAccountDraftAnswers>,
): PreAccountDraft {
  return {
    ...draft,
    answers: {
      ...draft.answers,
      ...updates,
    },
  };
}
