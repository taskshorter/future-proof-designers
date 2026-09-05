"use server";

import { redirect } from "next/navigation";

import { buildSignInPath } from "@/lib/auth/safe-return-path";
import type { PreAccountDraftAnswers } from "@/lib/draft/schema";
import { validateDraftAnswersForSubmit } from "@/lib/draft/schema";
import {
  getProjectResumeDetail,
  listResumeProjects,
  startOrSaveProject,
} from "@/lib/factory/gateway";
import {
  mapFactoryCategoryToUserMessage,
  type FactoryErrorCategory,
  type ProjectResumeDetail,
  type ProjectResumeSummary,
} from "@/lib/factory/contract";
import { getVerifiedAccessToken } from "@/lib/supabase/server";

export type ProjectActionResult =
  | {
      ok: true;
      kind: "started";
      projectId: string;
      alreadyCompleted: boolean;
      replayed: boolean;
    }
  | {
      ok: false;
      category: FactoryErrorCategory;
      message: string;
    };

export type PortalResumeState =
  | { status: "unauthenticated" }
  | { status: "reauth"; message: string; signInPath: string }
  | { status: "success"; projects: ProjectResumeSummary[] }
  | {
      status: "error";
      category: FactoryErrorCategory;
      message: string;
    };

export type ProjectDetailLoadResult =
  | { status: "success"; data: ProjectResumeDetail }
  | { status: "reauth"; message: string; signInPath: string }
  | { status: "not_found" }
  | {
      status: "error";
      category:
        | "permission_denied"
        | "temporary_failure"
        | "internal_error"
        | "invalid_input"
        | "stale_or_conflicting"
        | "already_completed";
      message: string;
    };

function toProjectAnswers(answers: PreAccountDraftAnswers) {
  return {
    hasExistingWebsite: answers.hasExistingWebsite as boolean,
    existingWebsiteUrl:
      answers.hasExistingWebsite && answers.existingWebsiteUrl
        ? answers.existingWebsiteUrl
        : null,
    businessDescription: answers.businessDescription,
    thirdAnswer: answers.thirdAnswer,
  };
}

async function gatewayDeps() {
  return {
    getAccessToken: getVerifiedAccessToken,
  };
}

export async function submitProjectStartAction(input: {
  operationId: string;
  answers: PreAccountDraftAnswers;
  targetCustomerId?: string | null;
}): Promise<ProjectActionResult> {
  const validationError = validateDraftAnswersForSubmit(input.answers);
  if (validationError) {
    return {
      ok: false,
      category: "invalid_input",
      message: validationError,
    };
  }

  const result = await startOrSaveProject(
    {
      operationId: input.operationId,
      correlationId: crypto.randomUUID(),
      answers: toProjectAnswers(input.answers),
      targetCustomerId: input.targetCustomerId ?? null,
      provisionalNames: undefined,
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

  return {
    ok: true,
    kind: "started",
    projectId: result.data.projectId,
    alreadyCompleted: result.data.alreadyCompleted,
    replayed: result.data.replayed,
  };
}

export async function loadPortalResumeState(): Promise<PortalResumeState> {
  const accessToken = await getVerifiedAccessToken();
  if (!accessToken) {
    return { status: "unauthenticated" };
  }

  const result = await listResumeProjects(await gatewayDeps());
  if (!result.ok) {
    if (result.category === "auth_required" || result.category === "session_expired") {
      return {
        status: "reauth",
        message: mapFactoryCategoryToUserMessage(result.category),
        signInPath: buildSignInPath("/portal"),
      };
    }

    return {
      status: "error",
      category: result.category,
      message: mapFactoryCategoryToUserMessage(result.category),
    };
  }

  return {
    status: "success",
    projects: result.data,
  };
}

export async function loadProjectResumeDetail(
  projectId: string,
): Promise<ProjectDetailLoadResult> {
  const accessToken = await getVerifiedAccessToken();
  const returnPath = `/portal/projects/${encodeURIComponent(projectId)}`;

  if (!accessToken) {
    redirect(buildSignInPath(returnPath));
  }

  const result = await getProjectResumeDetail(projectId, await gatewayDeps());
  if (result.ok) {
    return { status: "success", data: result.data };
  }

  if (result.category === "auth_required" || result.category === "session_expired") {
    return {
      status: "reauth",
      message: mapFactoryCategoryToUserMessage(result.category),
      signInPath: buildSignInPath(returnPath),
    };
  }

  if (result.category === "not_found") {
    return { status: "not_found" };
  }

  return {
    status: "error",
    category: result.category,
    message: mapFactoryCategoryToUserMessage(result.category),
  };
}
