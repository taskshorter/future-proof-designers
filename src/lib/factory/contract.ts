import { z } from "zod";

export const FACTORY_ERROR_CATEGORIES = [
  "auth_required",
  "session_expired",
  "not_found",
  "permission_denied",
  "invalid_input",
  "stale_or_conflicting",
  "already_completed",
  "temporary_failure",
  "internal_error",
] as const;

export type FactoryErrorCategory = (typeof FACTORY_ERROR_CATEGORIES)[number];

export const factoryErrorSchema = z.object({
  category: z.enum(FACTORY_ERROR_CATEGORIES),
  message: z.string(),
});

export const factoryErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: factoryErrorSchema,
});

export const projectAnswersSchema = z.object({
  hasExistingWebsite: z.boolean(),
  existingWebsiteUrl: z.string().nullable(),
  businessDescription: z.string(),
  thirdAnswer: z.string(),
});

export const provisionalNamesSchema = z
  .object({
    customer: z.string().optional(),
    business: z.string().optional(),
    website: z.string().optional(),
    project: z.string().optional(),
  })
  .optional();

export const projectStartRequestSchema = z.object({
  operationId: z.string().min(1).max(128),
  correlationId: z.string().uuid(),
  answers: projectAnswersSchema,
  targetCustomerId: z.string().uuid().nullable(),
  provisionalNames: provisionalNamesSchema,
});

export type ProjectStartRequest = z.infer<typeof projectStartRequestSchema>;

export const projectStartSuccessSchema = z.object({
  ok: z.literal(true),
  replayed: z.boolean(),
  alreadyCompleted: z.boolean(),
  customerId: z.string().uuid(),
  businessId: z.string().uuid(),
  websiteId: z.string().uuid(),
  projectId: z.string().uuid(),
  intakeRecordId: z.string().uuid(),
});

export type ProjectStartSuccess = z.infer<typeof projectStartSuccessSchema>;

export const resumeProjectSummarySchema = z.object({
  projectId: z.string().uuid(),
  projectName: z.string(),
  customerId: z.string().uuid(),
  customerName: z.string(),
  businessId: z.string().uuid(),
  websiteId: z.string().uuid(),
  lifecycleState: z.literal("ONBOARDING"),
  requiredAction: z.string(),
  commercialState: z.string(),
  provisioningState: z.string(),
  operationalHealth: z.string(),
  createdAt: z.string(),
});

export const projectResumeListSuccessSchema = z.object({
  ok: z.literal(true),
  projects: z.array(resumeProjectSummarySchema),
});

export const projectIntakeSchema = z
  .object({
    intakeRecordId: z.string().uuid(),
    hasExistingWebsite: z.boolean(),
    existingWebsiteUrl: z.string().nullable(),
    businessDescription: z.string(),
    thirdAnswerKey: z.string(),
    thirdAnswer: z.string(),
  })
  .nullable();

export const projectResumeDetailSuccessSchema = z.object({
  ok: z.literal(true),
  project: resumeProjectSummarySchema,
  intake: projectIntakeSchema,
});

export type ProjectResumeSummary = z.infer<typeof resumeProjectSummarySchema>;
export type ProjectResumeDetail = z.infer<typeof projectResumeDetailSuccessSchema>;

export const ONBOARDING_SECTION_KEYS = [
  "BUSINESS",
  "BRAND",
  "CONTENT",
  "GOALS",
  "REVIEW",
] as const;

export type OnboardingSectionKey = (typeof ONBOARDING_SECTION_KEYS)[number];

export const ONBOARDING_SECTION_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETE",
] as const;

export type OnboardingSectionStatus =
  (typeof ONBOARDING_SECTION_STATUSES)[number];

export const ONBOARDING_WRITE_STATUSES = ["IN_PROGRESS", "COMPLETE"] as const;

export type OnboardingWriteStatus = (typeof ONBOARDING_WRITE_STATUSES)[number];

export const ONBOARDING_ANSWER_ORIGINS = [
  "CUSTOMER_ENTERED",
  "CUSTOMER_CONFIRMED",
] as const;

export const onboardingSectionSchema = z.object({
  sectionKey: z.enum(ONBOARDING_SECTION_KEYS),
  status: z.enum(ONBOARDING_SECTION_STATUSES),
  version: z.number().int().nonnegative(),
  completedAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const onboardingAnswerSchema = z.object({
  fieldKey: z.string().min(1),
  sectionKey: z.enum(ONBOARDING_SECTION_KEYS),
  value: z.unknown(),
  origin: z.enum(ONBOARDING_ANSWER_ORIGINS),
  version: z.number().int().positive(),
  updatedAt: z.string(),
});

export const getProjectOnboardingSuccessSchema = z.object({
  ok: z.literal(true),
  projectId: z.string().uuid(),
  sections: z.array(onboardingSectionSchema).length(5),
  answers: z.array(onboardingAnswerSchema),
});

export type ProjectOnboardingState = z.infer<
  typeof getProjectOnboardingSuccessSchema
>;

export const saveProjectOnboardingSectionRequestSchema = z.object({
  operationId: z.string().min(1).max(128),
  correlationId: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  status: z.enum(ONBOARDING_WRITE_STATUSES),
  answers: z.record(z.string(), z.unknown()).default({}),
  removeFieldKeys: z.array(z.string()).default([]),
});

export type SaveProjectOnboardingSectionRequest = z.infer<
  typeof saveProjectOnboardingSectionRequestSchema
>;

export const saveProjectOnboardingSectionSuccessSchema = z.object({
  ok: z.literal(true),
  replayed: z.boolean(),
  projectId: z.string().uuid(),
  sectionKey: z.enum(ONBOARDING_SECTION_KEYS),
  status: z.enum(ONBOARDING_WRITE_STATUSES),
  version: z.number().int().positive(),
  completedAt: z.string().nullable(),
  updatedAnswerFieldKeys: z.array(z.string()),
  removedFieldKeys: z.array(z.string()),
});

export type SaveProjectOnboardingSectionSuccess = z.infer<
  typeof saveProjectOnboardingSectionSuccessSchema
>;

export type FactoryGatewayResult<T> =
  | { ok: true; data: T }
  | { ok: false; category: FactoryErrorCategory; message: string };

export function mapFactoryCategoryToUserMessage(
  category: FactoryErrorCategory,
): string {
  switch (category) {
    case "auth_required":
    case "session_expired":
      return "Your session expired. Sign in again to continue.";
    case "temporary_failure":
      return "The service is temporarily unavailable. Please try again.";
    case "stale_or_conflicting":
      return "This project was updated elsewhere. Reload the saved version before continuing.";
    case "already_completed":
      return "This finding was already handled. Refresh the latest project state.";
    case "invalid_input":
      return "Some information could not be accepted. Review your answers and try again.";
    case "permission_denied":
    case "not_found":
      return "We could not access that project.";
    case "internal_error":
    default:
      return "Something went wrong. Please try again later.";
  }
}

export const RESEARCH_RUN_KINDS = [
  "INITIAL_WHOLE_SITE",
  "PUBLIC_LINK_IMPORT",
  "GENERAL_RESEARCH",
] as const;

export const RESEARCH_RUN_STATUSES = [
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "PARTIAL",
  "FAILED",
] as const;

export const RESEARCH_SOURCE_CLASSIFICATIONS = ["DISCOVERED", "IMPORTED"] as const;

export const RESEARCH_CANDIDATE_DERIVATIONS = [
  "DISCOVERED",
  "IMPORTED",
  "AI_DERIVED",
] as const;

export const RESEARCH_CANDIDATE_DISPOSITIONS = [
  "PENDING",
  "ACCEPTED",
  "EDITED",
  "REJECTED",
  "SUPERSEDED",
] as const;

export const researchRunSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(RESEARCH_RUN_KINDS),
  status: z.enum(RESEARCH_RUN_STATUSES),
  normalizedUrl: z.string().nullable(),
  failureClassification: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
});

export const researchSourceSchema = z.object({
  id: z.string().uuid(),
  researchRunId: z.string().uuid(),
  sourceUrl: z.string(),
  classification: z.enum(RESEARCH_SOURCE_CLASSIFICATIONS),
  observedAt: z.string(),
  safeMetadata: z.record(z.string(), z.unknown()),
});

export const researchCandidateSchema = z.object({
  id: z.string().uuid(),
  researchRunId: z.string().uuid(),
  fieldKey: z.string().nullable(),
  extractedValue: z.unknown(),
  derivation: z.enum(RESEARCH_CANDIDATE_DERIVATIONS),
  disposition: z.enum(RESEARCH_CANDIDATE_DISPOSITIONS),
  advisoryConfidence: z.number().nullable(),
  observedAt: z.string(),
  sourceIds: z.array(z.string().uuid()),
});

export const getProjectResearchSuccessSchema = z.object({
  ok: z.literal(true),
  projectId: z.string().uuid(),
  runs: z.array(researchRunSchema),
  sources: z.array(researchSourceSchema),
  candidates: z.array(researchCandidateSchema),
});

export type ProjectResearchState = z.infer<typeof getProjectResearchSuccessSchema>;
export type ResearchRun = z.infer<typeof researchRunSchema>;
export type ResearchSource = z.infer<typeof researchSourceSchema>;
export type ResearchCandidate = z.infer<typeof researchCandidateSchema>;

export const acceptResearchCandidateRequestSchema = z.object({
  operationId: z.string().min(1).max(128),
  correlationId: z.string().uuid(),
  expectedSectionVersion: z.number().int().nonnegative(),
});

export type AcceptResearchCandidateRequest = z.infer<
  typeof acceptResearchCandidateRequestSchema
>;

export const editResearchCandidateRequestSchema =
  acceptResearchCandidateRequestSchema.extend({
    value: z.unknown(),
  });

export type EditResearchCandidateRequest = z.infer<
  typeof editResearchCandidateRequestSchema
>;

export const rejectResearchCandidateRequestSchema = z.object({
  operationId: z.string().min(1).max(128),
  correlationId: z.string().uuid(),
});

export type RejectResearchCandidateRequest = z.infer<
  typeof rejectResearchCandidateRequestSchema
>;

export const reconcileResearchCandidateSuccessSchema = z.object({
  ok: z.literal(true),
  replayed: z.boolean(),
  projectId: z.string().uuid(),
  candidateId: z.string().uuid(),
  disposition: z.enum(["ACCEPTED", "EDITED"]),
  fieldKey: z.string().min(1),
  sectionKey: z.enum(ONBOARDING_SECTION_KEYS),
  sectionVersion: z.number().int().positive(),
  answerVersion: z.number().int().positive(),
  completedAt: z.string().nullable(),
});

export type ReconcileResearchCandidateSuccess = z.infer<
  typeof reconcileResearchCandidateSuccessSchema
>;

export const rejectResearchCandidateSuccessSchema = z.object({
  ok: z.literal(true),
  replayed: z.boolean(),
  projectId: z.string().uuid(),
  candidateId: z.string().uuid(),
  disposition: z.literal("REJECTED"),
});

export type RejectResearchCandidateSuccess = z.infer<
  typeof rejectResearchCandidateSuccessSchema
>;
