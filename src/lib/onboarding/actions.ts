"use server";

import { redirect } from "next/navigation";

import { buildSignInPath } from "@/lib/auth/safe-return-path";
import {
  mapFactoryCategoryToUserMessage,
  type FactoryErrorCategory,
  type OnboardingSectionKey,
  type OnboardingWriteStatus,
  type ProjectOnboardingState,
  type ProjectResumeDetail,
  type SaveProjectOnboardingSectionSuccess,
} from "@/lib/factory/contract";
import {
  getProjectOnboarding,
  getProjectResumeDetail,
  saveProjectOnboardingSection,
} from "@/lib/factory/gateway";
import { getVerifiedAccessToken } from "@/lib/supabase/server";

export type OnboardingPageLoadResult =
  | {
      status: "success";
      resume: ProjectResumeDetail;
      onboarding: ProjectOnboardingState;
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

async function gatewayDeps() {
  return {
    getAccessToken: getVerifiedAccessToken,
  };
}

function onboardingReturnPath(projectId: string): string {
  return `/portal/projects/${encodeURIComponent(projectId)}/onboarding`;
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
  const [resumeResult, onboardingResult] = await Promise.all([
    getProjectResumeDetail(projectId, deps),
    getProjectOnboarding(projectId, deps),
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
