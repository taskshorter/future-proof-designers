import "server-only";

import { getServerEnv } from "@/lib/env/get-server-env";
import {
  acceptResearchCandidateRequestSchema,
  assembleWebsitePlanRequestSchema,
  assembleWebsitePlanSuccessSchema,
  completeProjectAssetUploadRequestSchema,
  completeProjectAssetUploadSuccessSchema,
  confirmWebsitePlanRequestSchema,
  confirmWebsitePlanSuccessSchema,
  createProjectAssetReadIntentRequestSchema,
  createProjectAssetReadIntentSuccessSchema,
  createProjectAssetUploadIntentRequestSchema,
  createProjectAssetUploadIntentSuccessSchema,
  depositCheckoutRequestSchema,
  depositCheckoutSuccessSchema,
  depositPaymentStatusProjectionSchema,
  editResearchCandidateRequestSchema,
  factoryErrorResponseSchema,
  getCommercialOfferSuccessSchema,
  getProjectOnboardingSuccessSchema,
  getProjectQuoteSuccessSchema,
  getProjectResearchSuccessSchema,
  getWebsitePlanSuccessSchema,
  listProjectAssetsSuccessSchema,
  projectResumeDetailSuccessSchema,
  projectResumeListSuccessSchema,
  projectStartRequestSchema,
  projectStartSuccessSchema,
  reapproveCommercialOfferRequestSchema,
  reapproveCommercialOfferSuccessSchema,
  reconcileResearchCandidateSuccessSchema,
  rejectResearchCandidateRequestSchema,
  rejectResearchCandidateSuccessSchema,
  removeProjectAssetRequestSchema,
  removeProjectAssetSuccessSchema,
  respondCommercialNeedInfoRequestSchema,
  respondCommercialNeedInfoSuccessSchema,
  reviseWebsitePlanRequestSchema,
  reviseWebsitePlanSuccessSchema,
  saveProjectOnboardingSectionRequestSchema,
  saveProjectOnboardingSectionSuccessSchema,
  updateProjectAssetRightsRequestSchema,
  updateProjectAssetRightsSuccessSchema,
  type AcceptResearchCandidateRequest,
  type AssembleWebsitePlanRequest,
  type AssembleWebsitePlanSuccess,
  type CompleteProjectAssetUploadRequest,
  type CompleteProjectAssetUploadSuccess,
  type ConfirmWebsitePlanRequest,
  type ConfirmWebsitePlanSuccess,
  type CreateProjectAssetReadIntentRequest,
  type CreateProjectAssetReadIntentSuccess,
  type CreateProjectAssetUploadIntentRequest,
  type CreateProjectAssetUploadIntentSuccess,
  type DepositCheckoutRequest,
  type DepositCheckoutSuccess,
  type DepositPaymentStatusProjection,
  type EditResearchCandidateRequest,
  type FactoryErrorCategory,
  type FactoryGatewayResult,
  type GetCommercialOfferSuccess,
  validateStripeCheckoutUrl,
  type GetProjectQuoteSuccess,
  type GetWebsitePlanSuccess,
  type ListProjectAssetsSuccess,
  type OnboardingSectionKey,
  type ProjectOnboardingState,
  type ProjectResearchState,
  type ProjectResumeDetail,
  type ProjectStartRequest,
  type ProjectStartSuccess,
  type ProjectResumeSummary,
  type ReapproveCommercialOfferRequest,
  type ReapproveCommercialOfferSuccess,
  type ReconcileResearchCandidateSuccess,
  type RejectResearchCandidateRequest,
  type RejectResearchCandidateSuccess,
  type RemoveProjectAssetRequest,
  type RemoveProjectAssetSuccess,
  type RespondCommercialNeedInfoRequest,
  type RespondCommercialNeedInfoSuccess,
  type ReviseWebsitePlanRequest,
  type ReviseWebsitePlanSuccess,
  type SaveProjectOnboardingSectionRequest,
  type SaveProjectOnboardingSectionSuccess,
  type UpdateProjectAssetRightsRequest,
  type UpdateProjectAssetRightsSuccess,
} from "./contract";

const DEFAULT_TIMEOUT_MS = 10_000;

export type FactoryGatewayDependencies = {
  fetchImpl?: typeof fetch;
  getAccessToken: () => Promise<string | null>;
  getGatewayBaseUrl?: () => string;
  timeoutMs?: number;
};

async function factoryFetch<T>(
  path: string,
  init: RequestInit,
  deps: FactoryGatewayDependencies,
  parser: (payload: unknown) => T,
): Promise<FactoryGatewayResult<T>> {
  const accessToken = await deps.getAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      category: "auth_required",
      message: "Authentication required",
    };
  }

  const baseUrl = deps.getGatewayBaseUrl?.() ?? getServerEnv().FACTORY_CUSTOMER_GATEWAY_URL;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), deps.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        ok: false,
        category: "internal_error",
        message: "Unexpected response from service",
      };
    }

    if (response.ok) {
      try {
        return { ok: true, data: parser(payload) };
      } catch {
        return {
          ok: false,
          category: "internal_error",
          message: "Unexpected response from service",
        };
      }
    }

    const parsedError = factoryErrorResponseSchema.safeParse(payload);
    if (parsedError.success) {
      return {
        ok: false,
        category: parsedError.data.error.category,
        message: parsedError.data.error.message,
      };
    }

    const fallbackCategory = mapHttpStatusToCategory(response.status);
    return {
      ok: false,
      category: fallbackCategory,
      message: "Request failed",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        category: "temporary_failure",
        message: "Request timed out",
      };
    }

    return {
      ok: false,
      category: "temporary_failure",
      message: "Network failure",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function mapHttpStatusToCategory(status: number): FactoryErrorCategory {
  if (status === 401) return "session_expired";
  if (status === 403) return "permission_denied";
  if (status === 404) return "not_found";
  if (status === 400) return "invalid_input";
  if (status === 409) return "stale_or_conflicting";
  if (status === 503) return "temporary_failure";
  return "internal_error";
}

export async function startOrSaveProject(
  request: ProjectStartRequest,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<ProjectStartSuccess>> {
  projectStartRequestSchema.parse(request);

  return factoryFetch(
    "/api/v1/projects/start",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
    deps,
    (payload) => projectStartSuccessSchema.parse(payload),
  );
}

export async function listResumeProjects(
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<ProjectResumeSummary[]>> {
  const result = await factoryFetch(
    "/api/v1/projects/resume",
    { method: "GET" },
    deps,
    (payload) => projectResumeListSuccessSchema.parse(payload).projects,
  );

  return result;
}

export async function getProjectResumeDetail(
  projectId: string,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<ProjectResumeDetail>> {
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/resume`,
    { method: "GET" },
    deps,
    (payload) => projectResumeDetailSuccessSchema.parse(payload),
  );
}

export async function getProjectOnboarding(
  projectId: string,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<ProjectOnboardingState>> {
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/onboarding`,
    { method: "GET" },
    deps,
    (payload) => getProjectOnboardingSuccessSchema.parse(payload),
  );
}

export async function saveProjectOnboardingSection(
  projectId: string,
  sectionKey: OnboardingSectionKey,
  request: SaveProjectOnboardingSectionRequest,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<SaveProjectOnboardingSectionSuccess>> {
  const normalized = saveProjectOnboardingSectionRequestSchema.parse(request);

  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/onboarding/sections/${encodeURIComponent(sectionKey)}`,
    {
      method: "PUT",
      body: JSON.stringify(normalized),
    },
    deps,
    (payload) => saveProjectOnboardingSectionSuccessSchema.parse(payload),
  );
}

export async function getProjectResearch(
  projectId: string,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<ProjectResearchState>> {
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/research`,
    { method: "GET" },
    deps,
    (payload) => getProjectResearchSuccessSchema.parse(payload),
  );
}

export async function acceptResearchCandidate(
  projectId: string,
  candidateId: string,
  request: AcceptResearchCandidateRequest,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<ReconcileResearchCandidateSuccess>> {
  const normalized = acceptResearchCandidateRequestSchema.parse(request);
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/research/candidates/${encodeURIComponent(candidateId)}/accept`,
    {
      method: "POST",
      body: JSON.stringify(normalized),
    },
    deps,
    (payload) => reconcileResearchCandidateSuccessSchema.parse(payload),
  );
}

export async function editResearchCandidate(
  projectId: string,
  candidateId: string,
  request: EditResearchCandidateRequest,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<ReconcileResearchCandidateSuccess>> {
  const normalized = editResearchCandidateRequestSchema.parse(request);
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/research/candidates/${encodeURIComponent(candidateId)}/edit`,
    {
      method: "POST",
      body: JSON.stringify(normalized),
    },
    deps,
    (payload) => reconcileResearchCandidateSuccessSchema.parse(payload),
  );
}

export async function rejectResearchCandidate(
  projectId: string,
  candidateId: string,
  request: RejectResearchCandidateRequest,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<RejectResearchCandidateSuccess>> {
  const normalized = rejectResearchCandidateRequestSchema.parse(request);
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/research/candidates/${encodeURIComponent(candidateId)}/reject`,
    {
      method: "POST",
      body: JSON.stringify(normalized),
    },
    deps,
    (payload) => rejectResearchCandidateSuccessSchema.parse(payload),
  );
}

export async function listProjectAssets(
  projectId: string,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<ListProjectAssetsSuccess>> {
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/assets`,
    { method: "GET" },
    deps,
    (payload) => listProjectAssetsSuccessSchema.parse(payload),
  );
}

export async function createProjectAssetUploadIntent(
  projectId: string,
  request: CreateProjectAssetUploadIntentRequest,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<CreateProjectAssetUploadIntentSuccess>> {
  const normalized = createProjectAssetUploadIntentRequestSchema.parse(request);
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/assets/upload-intent`,
    {
      method: "POST",
      body: JSON.stringify(normalized),
    },
    deps,
    (payload) => createProjectAssetUploadIntentSuccessSchema.parse(payload),
  );
}

export async function completeProjectAssetUpload(
  projectId: string,
  assetId: string,
  request: CompleteProjectAssetUploadRequest,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<CompleteProjectAssetUploadSuccess>> {
  const normalized = completeProjectAssetUploadRequestSchema.parse(request);
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/complete`,
    {
      method: "POST",
      body: JSON.stringify(normalized),
    },
    deps,
    (payload) => completeProjectAssetUploadSuccessSchema.parse(payload),
  );
}

export async function createProjectAssetReadIntent(
  projectId: string,
  assetId: string,
  request: CreateProjectAssetReadIntentRequest,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<CreateProjectAssetReadIntentSuccess>> {
  const normalized = createProjectAssetReadIntentRequestSchema.parse(request);
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/read-intent`,
    {
      method: "POST",
      body: JSON.stringify(normalized),
    },
    deps,
    (payload) => createProjectAssetReadIntentSuccessSchema.parse(payload),
  );
}

export async function removeProjectAsset(
  projectId: string,
  assetId: string,
  request: RemoveProjectAssetRequest,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<RemoveProjectAssetSuccess>> {
  const normalized = removeProjectAssetRequestSchema.parse(request);
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/remove`,
    {
      method: "POST",
      body: JSON.stringify(normalized),
    },
    deps,
    (payload) => removeProjectAssetSuccessSchema.parse(payload),
  );
}

export async function updateProjectAssetRights(
  projectId: string,
  assetId: string,
  request: UpdateProjectAssetRightsRequest,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<UpdateProjectAssetRightsSuccess>> {
  const normalized = updateProjectAssetRightsRequestSchema.parse(request);
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/rights`,
    {
      method: "POST",
      body: JSON.stringify(normalized),
    },
    deps,
    (payload) => updateProjectAssetRightsSuccessSchema.parse(payload),
  );
}

export async function getWebsitePlan(
  projectId: string,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<GetWebsitePlanSuccess>> {
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/website-plan`,
    { method: "GET" },
    deps,
    (payload) => getWebsitePlanSuccessSchema.parse(payload),
  );
}

export async function assembleWebsitePlan(
  projectId: string,
  request: AssembleWebsitePlanRequest,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<AssembleWebsitePlanSuccess>> {
  const normalized = assembleWebsitePlanRequestSchema.parse(request);
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/website-plan/assemble`,
    {
      method: "POST",
      body: JSON.stringify(normalized),
    },
    deps,
    (payload) => assembleWebsitePlanSuccessSchema.parse(payload),
  );
}

export async function reviseWebsitePlan(
  projectId: string,
  request: ReviseWebsitePlanRequest,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<ReviseWebsitePlanSuccess>> {
  const normalized = reviseWebsitePlanRequestSchema.parse(request);
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/website-plan/revisions`,
    {
      method: "POST",
      body: JSON.stringify(normalized),
    },
    deps,
    (payload) => reviseWebsitePlanSuccessSchema.parse(payload),
  );
}

export async function confirmWebsitePlan(
  projectId: string,
  planVersionId: string,
  request: ConfirmWebsitePlanRequest,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<ConfirmWebsitePlanSuccess>> {
  const normalized = confirmWebsitePlanRequestSchema.parse(request);
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/website-plan/${encodeURIComponent(planVersionId)}/confirm`,
    {
      method: "POST",
      body: JSON.stringify(normalized),
    },
    deps,
    (payload) => confirmWebsitePlanSuccessSchema.parse(payload),
  );
}

export async function getProjectQuote(
  projectId: string,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<GetProjectQuoteSuccess>> {
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/quote`,
    { method: "GET" },
    deps,
    (payload) => getProjectQuoteSuccessSchema.parse(payload),
  );
}

export async function getCommercialOffer(
  projectId: string,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<GetCommercialOfferSuccess>> {
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/commercial-offer`,
    { method: "GET" },
    deps,
    (payload) => getCommercialOfferSuccessSchema.parse(payload),
  );
}

export async function reapproveCommercialOffer(
  projectId: string,
  offerVersionId: string,
  request: ReapproveCommercialOfferRequest,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<ReapproveCommercialOfferSuccess>> {
  const normalized = reapproveCommercialOfferRequestSchema.parse(request);
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/commercial-offer/${encodeURIComponent(offerVersionId)}/reapprove`,
    {
      method: "POST",
      body: JSON.stringify(normalized),
    },
    deps,
    (payload) => reapproveCommercialOfferSuccessSchema.parse(payload),
  );
}

export async function respondCommercialNeedInfo(
  projectId: string,
  blockerId: string,
  request: RespondCommercialNeedInfoRequest,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<RespondCommercialNeedInfoSuccess>> {
  const normalized = respondCommercialNeedInfoRequestSchema.parse(request);
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/commercial/need-info/${encodeURIComponent(blockerId)}/respond`,
    {
      method: "POST",
      body: JSON.stringify(normalized),
    },
    deps,
    (payload) => respondCommercialNeedInfoSuccessSchema.parse(payload),
  );
}

export async function getDepositPayment(
  projectId: string,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<DepositPaymentStatusProjection>> {
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/deposit-payment`,
    { method: "GET" },
    deps,
    (payload) => depositPaymentStatusProjectionSchema.parse(payload),
  );
}

export async function initiateDepositCheckout(
  projectId: string,
  request: DepositCheckoutRequest,
  deps: FactoryGatewayDependencies,
): Promise<FactoryGatewayResult<DepositCheckoutSuccess>> {
  const normalized = depositCheckoutRequestSchema.parse(request);
  return factoryFetch(
    `/api/v1/projects/${encodeURIComponent(projectId)}/deposit-checkout`,
    {
      method: "POST",
      body: JSON.stringify(normalized),
    },
    deps,
    (payload) => {
      const parsed = depositCheckoutSuccessSchema.parse(payload);
      validateStripeCheckoutUrl(parsed.checkoutUrl);
      return parsed;
    },
  );
}
