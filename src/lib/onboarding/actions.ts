"use server";

import { redirect } from "next/navigation";

import { buildSignInPath } from "@/lib/auth/safe-return-path";
import {
  mapFactoryCategoryToUserMessage,
  type FactoryErrorCategory,
  type OnboardingSectionKey,
  type OnboardingWriteStatus,
  type ProjectOnboardingState,
  type ProjectResearchState,
  type ProjectResumeDetail,
  type ReconcileResearchCandidateSuccess,
  type RejectResearchCandidateSuccess,
  type SaveProjectOnboardingSectionSuccess,
} from "@/lib/factory/contract";
import {
  acceptResearchCandidate,
  editResearchCandidate,
  getProjectOnboarding,
  getProjectResearch,
  getProjectResumeDetail,
  rejectResearchCandidate,
  saveProjectOnboardingSection,
} from "@/lib/factory/gateway";
import { getVerifiedAccessToken } from "@/lib/supabase/server";
import {
  isReconcileResearchAction,
} from "@/lib/onboarding/reconcile-action";

export type { ReconcileResearchAction } from "@/lib/onboarding/reconcile-action";

export type ResearchLoadState =
  | { status: "ready"; data: ProjectResearchState }
  | {
      status: "unavailable";
      category: FactoryErrorCategory;
      message: string;
    };

export type OnboardingPageLoadResult =
  | {
      status: "success";
      resume: ProjectResumeDetail;
      onboarding: ProjectOnboardingState;
      research: ResearchLoadState;
    }
  | { status: "reauth"; message: string; signInPath: string }
  | { status: "not_found" }
  | {
      status: "error";
      category: FactoryErrorCategory;
      message: string;
    };

export type SaveOnboardingSectionResult =
  | {
      ok: true;
      data: SaveProjectOnboardingSectionSuccess;
    }
  | {
      ok: false;
      category: FactoryErrorCategory;
      message: string;
    };

export type RefreshResearchResult =
  | { ok: true; research: ResearchLoadState }
  | {
      ok: false;
      category: FactoryErrorCategory;
      message: string;
      signInPath?: string;
    };

export type AuthoritativeReloadResult =
  | {
      ok: true;
      onboarding: ProjectOnboardingState;
      research: ResearchLoadState;
    }
  | {
      ok: false;
      category: FactoryErrorCategory;
      message: string;
      signInPath?: string;
    };

export type ReconcileResearchCandidateResult =
  | {
      ok: true;
      reconcile:
        | ReconcileResearchCandidateSuccess
        | RejectResearchCandidateSuccess;
      onboarding: ProjectOnboardingState;
      research: ResearchLoadState;
    }
  | {
      ok: false;
      category: FactoryErrorCategory;
      message: string;
      signInPath?: string;
      onboarding?: ProjectOnboardingState;
      research?: ResearchLoadState;
    };

async function gatewayDeps() {
  return {
    getAccessToken: getVerifiedAccessToken,
  };
}

function onboardingReturnPath(projectId: string): string {
  return `/portal/projects/${encodeURIComponent(projectId)}/onboarding`;
}

async function loadResearchNonfatal(
  projectId: string,
): Promise<ResearchLoadState> {
  const result = await getProjectResearch(projectId, await gatewayDeps());
  if (!result.ok) {
    return {
      status: "unavailable",
      category: result.category,
      message: mapFactoryCategoryToUserMessage(result.category),
    };
  }
  return { status: "ready", data: result.data };
}

export async function loadProjectOnboardingPageData(
  projectId: string,
): Promise<OnboardingPageLoadResult> {
  const accessToken = await getVerifiedAccessToken();
  const returnPath = onboardingReturnPath(projectId);

  if (!accessToken) {
    redirect(buildSignInPath(returnPath));
  }

  const deps = await gatewayDeps();
  const [resumeResult, onboardingResult, research] = await Promise.all([
    getProjectResumeDetail(projectId, deps),
    getProjectOnboarding(projectId, deps),
    loadResearchNonfatal(projectId),
  ]);

  if (!resumeResult.ok) {
    if (
      resumeResult.category === "auth_required" ||
      resumeResult.category === "session_expired"
    ) {
      return {
        status: "reauth",
        message: mapFactoryCategoryToUserMessage(resumeResult.category),
        signInPath: buildSignInPath(returnPath),
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

  if (!onboardingResult.ok) {
    if (
      onboardingResult.category === "auth_required" ||
      onboardingResult.category === "session_expired"
    ) {
      return {
        status: "reauth",
        message: mapFactoryCategoryToUserMessage(onboardingResult.category),
        signInPath: buildSignInPath(returnPath),
      };
    }
    if (onboardingResult.category === "not_found") {
      return { status: "not_found" };
    }
    return {
      status: "error",
      category: onboardingResult.category,
      message: mapFactoryCategoryToUserMessage(onboardingResult.category),
    };
  }

  return {
    status: "success",
    resume: resumeResult.data,
    onboarding: onboardingResult.data,
    research,
  };
}

export async function saveOnboardingSectionAction(input: {
  projectId: string;
  sectionKey: OnboardingSectionKey;
  operationId: string;
  correlationId: string;
  expectedVersion: number;
  status: OnboardingWriteStatus;
  answers: Record<string, unknown>;
  removeFieldKeys: string[];
}): Promise<SaveOnboardingSectionResult> {
  const accessToken = await getVerifiedAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      category: "auth_required",
      message: mapFactoryCategoryToUserMessage("auth_required"),
    };
  }

  if (
    Object.prototype.hasOwnProperty.call(input.answers, "business.name") &&
    typeof input.answers["business.name"] === "string" &&
    input.answers["business.name"].trim() === ""
  ) {
    return {
      ok: false,
      category: "invalid_input",
      message: "Business name cannot be cleared. Enter a replacement name.",
    };
  }

  if (input.removeFieldKeys.includes("business.name")) {
    return {
      ok: false,
      category: "invalid_input",
      message: "Business name cannot be removed.",
    };
  }

  const result = await saveProjectOnboardingSection(
    input.projectId,
    input.sectionKey,
    {
      operationId: input.operationId,
      correlationId: input.correlationId,
      expectedVersion: input.expectedVersion,
      status: input.status,
      answers: input.answers,
      removeFieldKeys: input.removeFieldKeys,
    },
    await gatewayDeps(),
  );

  if (!result.ok) {
    return {
      ok: false,
      category: result.category,
      message: mapFactoryCategoryToUserMessage(result.category),
    };
  }

  return { ok: true, data: result.data };
}

export async function reloadProjectOnboardingAction(
  projectId: string,
): Promise<OnboardingPageLoadResult> {
  return loadProjectOnboardingPageData(projectId);
}

export async function refreshProjectResearchAction(
  projectId: string,
): Promise<RefreshResearchResult> {
  const accessToken = await getVerifiedAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      category: "auth_required",
      message: mapFactoryCategoryToUserMessage("auth_required"),
      signInPath: buildSignInPath(onboardingReturnPath(projectId)),
    };
  }

  return {
    ok: true,
    research: await loadResearchNonfatal(projectId),
  };
}

export async function reloadAuthoritativeOnboardingAndResearchAction(
  projectId: string,
): Promise<AuthoritativeReloadResult> {
  const accessToken = await getVerifiedAccessToken();
  const returnPath = onboardingReturnPath(projectId);
  if (!accessToken) {
    return {
      ok: false,
      category: "auth_required",
      message: mapFactoryCategoryToUserMessage("auth_required"),
      signInPath: buildSignInPath(returnPath),
    };
  }

  const deps = await gatewayDeps();
  const [onboardingResult, research] = await Promise.all([
    getProjectOnboarding(projectId, deps),
    loadResearchNonfatal(projectId),
  ]);

  if (!onboardingResult.ok) {
    if (
      onboardingResult.category === "auth_required" ||
      onboardingResult.category === "session_expired"
    ) {
      return {
        ok: false,
        category: onboardingResult.category,
        message: mapFactoryCategoryToUserMessage(onboardingResult.category),
        signInPath: buildSignInPath(returnPath),
      };
    }
    return {
      ok: false,
      category: onboardingResult.category,
      message: mapFactoryCategoryToUserMessage(onboardingResult.category),
    };
  }

  return {
    ok: true,
    onboarding: onboardingResult.data,
    research,
  };
}

export async function reconcileResearchCandidateAction(input: {
  projectId: string;
  candidateId: string;
  action: string;
  operationId: string;
  correlationId: string;
  expectedSectionVersion?: number;
  value?: unknown;
}): Promise<ReconcileResearchCandidateResult> {
  const accessToken = await getVerifiedAccessToken();
  const returnPath = onboardingReturnPath(input.projectId);
  if (!accessToken) {
    return {
      ok: false,
      category: "auth_required",
      message: mapFactoryCategoryToUserMessage("auth_required"),
      signInPath: buildSignInPath(returnPath),
    };
  }

  if (!isReconcileResearchAction(input.action)) {
    return {
      ok: false,
      category: "invalid_input",
      message: mapFactoryCategoryToUserMessage("invalid_input"),
    };
  }

  const action = input.action;
  const deps = await gatewayDeps();
  let mutateResult:
    | Awaited<ReturnType<typeof acceptResearchCandidate>>
    | Awaited<ReturnType<typeof editResearchCandidate>>
    | Awaited<ReturnType<typeof rejectResearchCandidate>>;

  if (action === "accept") {
    if (
      typeof input.expectedSectionVersion !== "number" ||
      !Number.isInteger(input.expectedSectionVersion) ||
      input.expectedSectionVersion < 0
    ) {
      return {
        ok: false,
        category: "invalid_input",
        message: mapFactoryCategoryToUserMessage("invalid_input"),
      };
    }
    mutateResult = await acceptResearchCandidate(
      input.projectId,
      input.candidateId,
      {
        operationId: input.operationId,
        correlationId: input.correlationId,
        expectedSectionVersion: input.expectedSectionVersion,
      },
      deps,
    );
  } else if (action === "edit") {
    if (
      typeof input.expectedSectionVersion !== "number" ||
      !Number.isInteger(input.expectedSectionVersion) ||
      input.expectedSectionVersion < 0
    ) {
      return {
        ok: false,
        category: "invalid_input",
        message: mapFactoryCategoryToUserMessage("invalid_input"),
      };
    }
    if (input.value === undefined) {
      return {
        ok: false,
        category: "invalid_input",
        message: mapFactoryCategoryToUserMessage("invalid_input"),
      };
    }
    mutateResult = await editResearchCandidate(
      input.projectId,
      input.candidateId,
      {
        operationId: input.operationId,
        correlationId: input.correlationId,
        expectedSectionVersion: input.expectedSectionVersion,
        value: input.value,
      },
      deps,
    );
  } else if (action === "reject") {
    mutateResult = await rejectResearchCandidate(
      input.projectId,
      input.candidateId,
      {
        operationId: input.operationId,
        correlationId: input.correlationId,
      },
      deps,
    );
  } else {
    return {
      ok: false,
      category: "invalid_input",
      message: mapFactoryCategoryToUserMessage("invalid_input"),
    };
  }

  if (!mutateResult.ok) {
    if (
      mutateResult.category === "already_completed" ||
      mutateResult.category === "stale_or_conflicting"
    ) {
      const reload = await reloadAuthoritativeOnboardingAndResearchAction(
        input.projectId,
      );
      if (reload.ok) {
        return {
          ok: false,
          category: mutateResult.category,
          message: mapFactoryCategoryToUserMessage(mutateResult.category),
          onboarding: reload.onboarding,
          research: reload.research,
        };
      }
    }

    if (
      mutateResult.category === "auth_required" ||
      mutateResult.category === "session_expired"
    ) {
      return {
        ok: false,
        category: mutateResult.category,
        message: mapFactoryCategoryToUserMessage(mutateResult.category),
        signInPath: buildSignInPath(returnPath),
      };
    }

    return {
      ok: false,
      category: mutateResult.category,
      message: mapFactoryCategoryToUserMessage(mutateResult.category),
    };
  }

  const reload = await reloadAuthoritativeOnboardingAndResearchAction(
    input.projectId,
  );
  if (!reload.ok) {
    return {
      ok: false,
      category: reload.category,
      message: reload.message,
      signInPath: reload.signInPath,
    };
  }

  return {
    ok: true,
    reconcile: mutateResult.data,
    onboarding: reload.onboarding,
    research: reload.research,
  };
}
