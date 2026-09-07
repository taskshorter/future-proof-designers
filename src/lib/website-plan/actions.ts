"use server";

import { buildSignInPath } from "@/lib/auth/safe-return-path";
import {
  mapFactoryCategoryToUserMessage,
  type AssembleWebsitePlanRequest,
  type ConfirmWebsitePlanRequest,
  type FactoryErrorCategory,
  type ProjectResumeDetail,
  type ReviseWebsitePlanRequest,
  type WebsitePlanProjection,
  type WebsitePlanRevision,
} from "@/lib/factory/contract";
import {
  assembleWebsitePlan,
  confirmWebsitePlan,
  getProjectResumeDetail,
  getWebsitePlan,
  reviseWebsitePlan,
} from "@/lib/factory/gateway";
import { getVerifiedAccessToken } from "@/lib/supabase/server";

export type WebsitePlanPageLoadResult =
  | {
      status: "success";
      resume: ProjectResumeDetail;
      plan: WebsitePlanProjection | null;
    }
  | { status: "reauth"; message: string; signInPath: string }
  | { status: "not_found" }
  | {
      status: "error";
      category: FactoryErrorCategory;
      message: string;
    };

export type WebsitePlanMutationResult =
  | {
      ok: true;
      plan: WebsitePlanProjection;
      replayed: boolean;
      requiredAction?: string;
    }
  | {
      ok: false;
      category: FactoryErrorCategory;
      message: string;
      signInPath?: string;
    };

async function gatewayDeps() {
  return {
    getAccessToken: getVerifiedAccessToken,
  };
}

function planReturnPath(projectId: string): string {
  return `/portal/projects/${encodeURIComponent(projectId)}/plan`;
}

function mutationFailure(
  category: FactoryErrorCategory,
  projectId: string,
): WebsitePlanMutationResult {
  return {
    ok: false,
    category,
    message: mapFactoryCategoryToUserMessage(category),
    signInPath:
      category === "auth_required" || category === "session_expired"
        ? buildSignInPath(planReturnPath(projectId))
        : undefined,
  };
}

export async function loadWebsitePlanPageData(
  projectId: string,
): Promise<WebsitePlanPageLoadResult> {
  const deps = await gatewayDeps();
  const resumeResult = await getProjectResumeDetail(projectId, deps);
  if (!resumeResult.ok) {
    if (
      resumeResult.category === "auth_required" ||
      resumeResult.category === "session_expired"
    ) {
      return {
        status: "reauth",
        message: mapFactoryCategoryToUserMessage(resumeResult.category),
        signInPath: buildSignInPath(planReturnPath(projectId)),
      };
    }
    if (resumeResult.category === "not_found") {
      return { status: "not_found" };
    }
    return {
      status: "error",
      category: resumeResult.category,
      message: mapFactoryCategoryToUserMessage(resumeResult.category),
    };
  }

  const planResult = await getWebsitePlan(projectId, deps);
  if (!planResult.ok) {
    if (
      planResult.category === "auth_required" ||
      planResult.category === "session_expired"
    ) {
      return {
        status: "reauth",
        message: mapFactoryCategoryToUserMessage(planResult.category),
        signInPath: buildSignInPath(planReturnPath(projectId)),
      };
    }
    if (planResult.category === "not_found") {
      return { status: "not_found" };
    }
    return {
      status: "error",
      category: planResult.category,
      message: mapFactoryCategoryToUserMessage(planResult.category),
    };
  }

  return {
    status: "success",
    resume: resumeResult.data,
    plan: planResult.data.plan,
  };
}

export async function reloadWebsitePlanAction(
  projectId: string,
): Promise<WebsitePlanMutationResult> {
  const result = await getWebsitePlan(projectId, await gatewayDeps());
  if (!result.ok) {
    return mutationFailure(result.category, projectId);
  }
  if (!result.data.plan) {
    return {
      ok: false,
      category: "not_found",
      message: mapFactoryCategoryToUserMessage("not_found"),
    };
  }
  return {
    ok: true,
    plan: result.data.plan,
    replayed: false,
  };
}

export async function assembleWebsitePlanAction(
  projectId: string,
  intent: AssembleWebsitePlanRequest,
): Promise<WebsitePlanMutationResult> {
  const result = await assembleWebsitePlan(
    projectId,
    intent,
    await gatewayDeps(),
  );
  if (!result.ok) {
    return mutationFailure(result.category, projectId);
  }
  return {
    ok: true,
    plan: result.data.plan,
    replayed: result.data.replayed,
  };
}

export async function reviseWebsitePlanAction(
  projectId: string,
  intent: {
    operationId: string;
    correlationId: string;
    expectedPlanVersion: number;
    revision: WebsitePlanRevision;
  },
): Promise<WebsitePlanMutationResult> {
  const request: ReviseWebsitePlanRequest = {
    operationId: intent.operationId,
    correlationId: intent.correlationId,
    expectedPlanVersion: intent.expectedPlanVersion,
    revision: intent.revision,
  };
  const result = await reviseWebsitePlan(
    projectId,
    request,
    await gatewayDeps(),
  );
  if (!result.ok) {
    return mutationFailure(result.category, projectId);
  }
  return {
    ok: true,
    plan: result.data.plan,
    replayed: result.data.replayed,
    requiredAction: result.data.requiredAction,
  };
}

export async function confirmWebsitePlanAction(
  projectId: string,
  intent: ConfirmWebsitePlanRequest & { planVersionId: string },
): Promise<WebsitePlanMutationResult> {
  const { planVersionId, ...request } = intent;
  const result = await confirmWebsitePlan(
    projectId,
    planVersionId,
    request,
    await gatewayDeps(),
  );
  if (!result.ok) {
    return mutationFailure(result.category, projectId);
  }
  return {
    ok: true,
    plan: result.data.plan,
    replayed: result.data.replayed,
    requiredAction: result.data.requiredAction,
  };
}
