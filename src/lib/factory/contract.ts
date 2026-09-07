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

/** Canonical Factory A3 project lifecycle states (compatibility only). */
export const PROJECT_LIFECYCLE_STATES = [
  "DRAFT",
  "ONBOARDING",
  "PLANNING",
  "PRODUCTION",
  "OWNER_REVIEW",
  "CUSTOMER_REVIEW",
  "LAUNCH_READY",
  "LIVE",
  "MAINTENANCE",
  "PAUSED",
  "CLOSED",
] as const;

export type ProjectLifecycleState = (typeof PROJECT_LIFECYCLE_STATES)[number];

export const resumeProjectSummarySchema = z.object({
  projectId: z.string().uuid(),
  projectName: z.string(),
  customerId: z.string().uuid(),
  customerName: z.string(),
  businessId: z.string().uuid(),
  websiteId: z.string().uuid(),
  lifecycleState: z.enum(PROJECT_LIFECYCLE_STATES),
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

/* -------------------------------------------------------------------------- */
/* Project assets (Factory B2-F3 public contract)                              */
/* -------------------------------------------------------------------------- */

export const PROJECT_ASSET_ORIGINS = [
  "CUSTOMER_UPLOAD",
  "PUBLICLY_DISCOVERED",
] as const;

export const PROJECT_ASSET_KINDS = ["IMAGE", "DOCUMENT", "VIDEO"] as const;

export const PROJECT_ASSET_LIFECYCLE_STATES = [
  "PENDING_UPLOAD",
  "AVAILABLE",
  "FAILED",
  "REMOVAL_PENDING",
  "REMOVED",
] as const;

export const PROJECT_ASSET_VALIDATION_STATES = [
  "UNVALIDATED",
  "VALIDATING",
  "VALID",
  "INVALID",
] as const;

export const PROJECT_ASSET_RIGHTS_STATES = [
  "CUSTOMER_PROJECT_USE_AUTHORIZED",
  "REUSE_RIGHTS_UNCONFIRMED",
  "CUSTOMER_CONFIRMED_PROJECT_USE",
  "DO_NOT_USE",
] as const;

export const PROJECT_ASSET_RIGHTS_DECISIONS = [
  "CONFIRM_PROJECT_USE",
  "DO_NOT_USE",
] as const;

/** Safe customer ProjectAsset projection — never includes object_key. */
export const projectAssetSchema = z.object({
  id: z.string().uuid(),
  origin: z.enum(PROJECT_ASSET_ORIGINS),
  assetKind: z.enum(PROJECT_ASSET_KINDS),
  lifecycleState: z.enum(PROJECT_ASSET_LIFECYCLE_STATES),
  validationState: z.enum(PROJECT_ASSET_VALIDATION_STATES),
  rightsState: z.enum(PROJECT_ASSET_RIGHTS_STATES),
  originalFilename: z.string(),
  declaredContentType: z.string(),
  declaredByteSize: z.number().int().nonnegative(),
  validatedContentType: z.string().nullable(),
  validatedByteSize: z.number().int().nonnegative().nullable(),
  contentHash: z.string().nullable(),
  version: z.number().int().positive(),
  createdAt: z.string(),
  availableAt: z.string().nullable(),
  failedAt: z.string().nullable(),
});

export type ProjectAsset = z.infer<typeof projectAssetSchema>;

export const listProjectAssetsSuccessSchema = z.object({
  ok: z.literal(true),
  projectId: z.string().uuid(),
  assets: z.array(projectAssetSchema),
});

export type ListProjectAssetsSuccess = z.infer<typeof listProjectAssetsSuccessSchema>;

export const projectAssetUploadCapabilitySchema = z.object({
  provider: z.literal("SUPABASE"),
  bucket: z.string().min(1),
  path: z.string().min(1),
  token: z.string().min(1),
  expiresAt: z.string().nullable(),
});

export type ProjectAssetUploadCapability = z.infer<
  typeof projectAssetUploadCapabilitySchema
>;

export const createProjectAssetUploadIntentRequestSchema = z.object({
  operationId: z.string().uuid(),
  correlationId: z.string().uuid(),
  originalFilename: z.string().min(1),
  contentType: z.string().min(1),
  byteSize: z.number().int().positive(),
});

export type CreateProjectAssetUploadIntentRequest = z.infer<
  typeof createProjectAssetUploadIntentRequestSchema
>;

export const createProjectAssetUploadIntentSuccessSchema = z.object({
  ok: z.literal(true),
  replayed: z.boolean(),
  projectId: z.string().uuid(),
  asset: projectAssetSchema,
  upload: projectAssetUploadCapabilitySchema,
});

export type CreateProjectAssetUploadIntentSuccess = z.infer<
  typeof createProjectAssetUploadIntentSuccessSchema
>;

export const completeProjectAssetUploadRequestSchema = z.object({
  operationId: z.string().uuid(),
  correlationId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
});

export type CompleteProjectAssetUploadRequest = z.infer<
  typeof completeProjectAssetUploadRequestSchema
>;

export const completeProjectAssetUploadSuccessSchema = z.object({
  ok: z.literal(true),
  replayed: z.boolean(),
  projectId: z.string().uuid(),
  asset: projectAssetSchema,
});

export type CompleteProjectAssetUploadSuccess = z.infer<
  typeof completeProjectAssetUploadSuccessSchema
>;

export const createProjectAssetReadIntentRequestSchema = z.object({
  operationId: z.string().uuid(),
  correlationId: z.string().uuid(),
});

export type CreateProjectAssetReadIntentRequest = z.infer<
  typeof createProjectAssetReadIntentRequestSchema
>;

export const projectAssetReadCapabilitySchema = z.object({
  url: z.string().min(1),
  expiresAt: z.string().min(1),
});

export type ProjectAssetReadCapability = z.infer<
  typeof projectAssetReadCapabilitySchema
>;

export const createProjectAssetReadIntentSuccessSchema = z.object({
  ok: z.literal(true),
  replayed: z.boolean(),
  projectId: z.string().uuid(),
  assetId: z.string().uuid(),
  read: projectAssetReadCapabilitySchema,
});

export type CreateProjectAssetReadIntentSuccess = z.infer<
  typeof createProjectAssetReadIntentSuccessSchema
>;

export const removeProjectAssetRequestSchema = z.object({
  operationId: z.string().uuid(),
  correlationId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
});

export type RemoveProjectAssetRequest = z.infer<typeof removeProjectAssetRequestSchema>;

export const removeProjectAssetSuccessSchema = z.object({
  ok: z.literal(true),
  replayed: z.boolean(),
  projectId: z.string().uuid(),
  asset: projectAssetSchema,
});

export type RemoveProjectAssetSuccess = z.infer<typeof removeProjectAssetSuccessSchema>;

export const updateProjectAssetRightsRequestSchema = z.object({
  operationId: z.string().uuid(),
  correlationId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  decision: z.enum(PROJECT_ASSET_RIGHTS_DECISIONS),
});

export type UpdateProjectAssetRightsRequest = z.infer<
  typeof updateProjectAssetRightsRequestSchema
>;

export type ProjectAssetRightsDecision =
  (typeof PROJECT_ASSET_RIGHTS_DECISIONS)[number];

export const updateProjectAssetRightsSuccessSchema = z.object({
  ok: z.literal(true),
  replayed: z.boolean(),
  projectId: z.string().uuid(),
  asset: projectAssetSchema,
});

export type UpdateProjectAssetRightsSuccess = z.infer<
  typeof updateProjectAssetRightsSuccessSchema
>;

/* -------------------------------------------------------------------------- */
/* B3-P1 Website Plan customer contract (mirrors merged Factory B3-F1)         */
/* -------------------------------------------------------------------------- */

export const WEBSITE_PLAN_PACKAGE_CATEGORIES = [
  "ESSENTIAL",
  "BUSINESS",
  "CUSTOM",
] as const;

export type WebsitePlanPackageCategory =
  (typeof WEBSITE_PLAN_PACKAGE_CATEGORIES)[number];

export const WEBSITE_PLAN_PAGE_ORIGINS = [
  "FP_RECOMMENDED",
  "CUSTOMER_ADDED",
  "CUSTOMER_REMOVED_FROM_RECOMMENDATION",
] as const;

export type WebsitePlanPageOrigin = (typeof WEBSITE_PLAN_PAGE_ORIGINS)[number];

export const WEBSITE_PLAN_MODULE_INCLUSIONS = [
  "RECOMMENDED",
  "INCLUDED",
  "DECLINED_BY_CUSTOMER",
] as const;

export type WebsitePlanModuleInclusion =
  (typeof WEBSITE_PLAN_MODULE_INCLUSIONS)[number];

export const WEBSITE_PLAN_ASSEMBLY_STATUSES = ["INCOMPLETE", "READY"] as const;

export type WebsitePlanAssemblyStatus =
  (typeof WEBSITE_PLAN_ASSEMBLY_STATUSES)[number];

export const WEBSITE_PLAN_MODULE_INTENTS = ["SELECT", "DECLINE"] as const;

export type WebsitePlanModuleIntent =
  (typeof WEBSITE_PLAN_MODULE_INTENTS)[number];

export const WEBSITE_PLAN_CONFIRM_REQUIRED_ACTIONS = ["SYSTEM", "OWNER"] as const;

export type WebsitePlanConfirmRequiredAction =
  (typeof WEBSITE_PLAN_CONFIRM_REQUIRED_ACTIONS)[number];

/** Customer Plan requiredAction values currently returned by Factory B3-F1. */
export const WEBSITE_PLAN_REQUIRED_ACTIONS = [
  "CUSTOMER",
  "SYSTEM",
  "OWNER",
] as const;

export type WebsitePlanRequiredAction =
  (typeof WEBSITE_PLAN_REQUIRED_ACTIONS)[number];

/** Initial canonical approved customer module ID from Factory B3-F1. */
export const CANONICAL_WEBSITE_PLAN_MODULE_KEYS = ["booklocal"] as const;

export type CanonicalWebsitePlanModuleKey =
  (typeof CANONICAL_WEBSITE_PLAN_MODULE_KEYS)[number];

const websitePlanPageKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/i);

export const websitePlanPageSchema = z.object({
  key: websitePlanPageKeySchema,
  title: z.string().min(1).max(2000),
  origin: z.enum(WEBSITE_PLAN_PAGE_ORIGINS),
  notes: z.string().max(2000).optional(),
});

export const websitePlanModuleSchema = z.object({
  moduleKey: z.string().min(1).max(64),
  inclusion: z.enum(WEBSITE_PLAN_MODULE_INCLUSIONS),
});

export const websitePlanAssetReferenceSchema = z.object({
  assetId: z.string().uuid(),
});

export const websitePlanProjectionSchema = z.object({
  projectId: z.string().uuid(),
  planId: z.string().uuid(),
  planVersion: z.number().int().positive(),
  planVersionId: z.string().uuid(),
  headerVersion: z.number().int().nonnegative(),
  confirmed: z.boolean(),
  requiredAction: z.enum(WEBSITE_PLAN_REQUIRED_ACTIONS).optional(),
  businessUnderstanding: z.string(),
  websiteGoals: z.array(z.string()),
  packageCategory: z.enum(WEBSITE_PLAN_PACKAGE_CATEGORIES).nullable(),
  packageRationale: z.string(),
  pages: z.array(websitePlanPageSchema),
  requiredFunctionality: z.array(z.string()),
  modules: z.array(websitePlanModuleSchema),
  customRequirements: z.array(z.string()),
  designDirection: z.string(),
  availableContentNotes: z.string(),
  missingContentNotes: z.string(),
  assetReferences: z.array(websitePlanAssetReferenceSchema),
  customerFacingAssumptions: z.array(z.string()),
  customerSafeAttention: z.array(z.string()),
  assemblyStatus: z.enum(WEBSITE_PLAN_ASSEMBLY_STATUSES),
  classificationAttention: z.array(z.string()),
});

export type WebsitePlanProjection = z.infer<typeof websitePlanProjectionSchema>;

export const getWebsitePlanSuccessSchema = z.object({
  ok: z.literal(true),
  plan: websitePlanProjectionSchema.nullable(),
});

export type GetWebsitePlanSuccess = z.infer<typeof getWebsitePlanSuccessSchema>;

export const assembleWebsitePlanRequestSchema = z.object({
  operationId: z.string().uuid(),
  correlationId: z.string().uuid(),
});

export type AssembleWebsitePlanRequest = z.infer<
  typeof assembleWebsitePlanRequestSchema
>;

export const assembleWebsitePlanSuccessSchema = z.object({
  ok: z.literal(true),
  replayed: z.boolean(),
  plan: websitePlanProjectionSchema,
});

export type AssembleWebsitePlanSuccess = z.infer<
  typeof assembleWebsitePlanSuccessSchema
>;

export const websitePlanRevisionSchema = z
  .object({
    addPages: z
      .array(
        z
          .object({
            requestKey: websitePlanPageKeySchema.optional(),
            title: z.string().min(1).max(2000),
            notes: z.string().max(2000).optional(),
          })
          .strict(),
      )
      .max(50)
      .optional(),
    removeRecommendedPages: z
      .array(z.object({ pageKey: websitePlanPageKeySchema }).strict())
      .max(50)
      .optional(),
    restoreRecommendedPages: z
      .array(z.object({ pageKey: websitePlanPageKeySchema }).strict())
      .max(50)
      .optional(),
    editPages: z
      .array(
        z
          .object({
            pageKey: websitePlanPageKeySchema,
            title: z.string().min(1).max(2000).optional(),
            notes: z.string().max(2000).optional(),
          })
          .strict(),
      )
      .max(50)
      .optional(),
    moduleIntents: z
      .array(
        z
          .object({
            moduleKey: z.enum(CANONICAL_WEBSITE_PLAN_MODULE_KEYS),
            intent: z.enum(WEBSITE_PLAN_MODULE_INTENTS),
          })
          .strict(),
      )
      .max(50)
      .optional(),
    customRequirements: z.array(z.string().min(1).max(2000)).max(50).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export type WebsitePlanRevision = z.infer<typeof websitePlanRevisionSchema>;

export const reviseWebsitePlanRequestSchema = z.object({
  operationId: z.string().uuid(),
  correlationId: z.string().uuid(),
  expectedPlanVersion: z.number().int().positive(),
  revision: websitePlanRevisionSchema,
});

export type ReviseWebsitePlanRequest = z.infer<
  typeof reviseWebsitePlanRequestSchema
>;

export const reviseWebsitePlanSuccessSchema = z.object({
  ok: z.literal(true),
  replayed: z.boolean(),
  plan: websitePlanProjectionSchema,
  requiredAction: z.literal("CUSTOMER"),
});

export type ReviseWebsitePlanSuccess = z.infer<
  typeof reviseWebsitePlanSuccessSchema
>;

export const confirmWebsitePlanRequestSchema = z.object({
  operationId: z.string().uuid(),
  correlationId: z.string().uuid(),
  expectedPlanVersion: z.number().int().positive(),
});

export type ConfirmWebsitePlanRequest = z.infer<
  typeof confirmWebsitePlanRequestSchema
>;

export const confirmWebsitePlanSuccessSchema = z.object({
  ok: z.literal(true),
  replayed: z.boolean(),
  plan: websitePlanProjectionSchema,
  requiredAction: z.enum(WEBSITE_PLAN_CONFIRM_REQUIRED_ACTIONS),
  // Factory B3-F1 currently returns these as null; accept and discard for B3-P1.
  quote: z.null().optional(),
  offer: z.null().optional(),
});

export type ConfirmWebsitePlanSuccess = z.infer<
  typeof confirmWebsitePlanSuccessSchema
>;
