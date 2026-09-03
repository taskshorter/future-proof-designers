import { z } from "zod";

export const FACTORY_ERROR_CATEGORIES = [
  "auth_required",
  "session_expired",
  "not_found",
  "permission_denied",
  "invalid_input",
  "stale_or_conflicting",
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
      return "This request conflicts with an earlier attempt. Use the same saved answers or contact support.";
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
