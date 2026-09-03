"use server";

import { redirect } from "next/navigation";

import type { PreAccountDraftAnswers } from "@/lib/draft/schema";
import { validateDraftAnswersForSubmit } from "@/lib/draft/schema";
import {
  getProjectResumeDetail,
  listResumeProjects,
  startOrSaveProject,
} from "@/lib/factory/gateway";
import {
  mapFactoryCategoryToUserMessage,
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
      category:
        | "auth_required"
        | "session_expired"
        | "not_found"
        | "permission_denied"
        | "invalid_input"
        | "stale_or_conflicting"
        | "temporary_failure"
        | "internal_error"
        | "account_selection_required";
      message: string;
    };

export type PortalResumeState = {
  authenticated: boolean;
  projects: ProjectResumeSummary[];
  errorMessage?: string;
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
    if (
      result.category === "invalid_input" &&
      result.message.toLowerCase().includes("target")
    ) {
      return {
        ok: false,
        category: "account_selection_required",
        message:
          "Account selection is required before saving this project. Choose an authorized account and try again.",
      };
    }

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
    return { authenticated: false, projects: [] };
  }

  const result = await listResumeProjects(await gatewayDeps());
  if (!result.ok) {
    return {
      authenticated: true,
      projects: [],
      errorMessage: mapFactoryCategoryToUserMessage(result.category),
    };
  }

  return {
    authenticated: true,
    projects: result.data,
  };
}

export async function loadProjectResumeDetail(
  projectId: string,
): Promise<ProjectResumeDetail | null> {
  const accessToken = await getVerifiedAccessToken();
  if (!accessToken) {
    redirect("/sign-in?next=/portal");
  }

  const result = await getProjectResumeDetail(projectId, await gatewayDeps());
  if (!result.ok) {
    return null;
  }

  return result.data;
}
