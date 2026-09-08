"use server";

import { buildSignInPath } from "@/lib/auth/safe-return-path";
import {
  mapFactoryCategoryToUserMessage,
  type CommercialOfferProjection,
  type DeclineProjection,
  type FactoryErrorCategory,
  type NeedInfoProjection,
  type ProjectResumeDetail,
  type QuoteProjection,
  type QuoteUnavailableReason,
  type CommercialOfferUnavailableReason,
  type WebsitePlanProjection,
} from "@/lib/factory/contract";
import {
  getCommercialOffer,
  getProjectQuote,
  getProjectResumeDetail,
  getWebsitePlan,
  reapproveCommercialOffer,
  respondCommercialNeedInfo,
} from "@/lib/factory/gateway";
import { getVerifiedAccessToken } from "@/lib/supabase/server";

export type CommercialSnapshot = {
  resume: ProjectResumeDetail;
  plan: WebsitePlanProjection | null;
  quote: QuoteProjection | null;
  quoteReason: QuoteUnavailableReason | null;
  offer: CommercialOfferProjection | null;
  offerReason: CommercialOfferUnavailableReason | null;
  needInfo: NeedInfoProjection | null;
  consultationRequired: boolean;
  decline: DeclineProjection | null;
  /** True when Plan/Quote/Offer version IDs disagree unexpectedly. */
  versionMismatch: boolean;
};

export type CommercialPageLoadResult =
  | { status: "success"; snapshot: CommercialSnapshot }
  | { status: "reauth"; message: string; signInPath: string }
  | { status: "not_found" }
  | {
      status: "error";
      category: FactoryErrorCategory;
      message: string;
    };

export type CommercialMutationResult =
  | { ok: true; snapshot: CommercialSnapshot; replayed: boolean }
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

function commercialReturnPath(projectId: string): string {
  return `/portal/projects/${encodeURIComponent(projectId)}/commercial`;
}

function mutationFailure(
  category: FactoryErrorCategory,
  projectId: string,
): CommercialMutationResult {
  return {
    ok: false,
    category,
    message: mapFactoryCategoryToUserMessage(category),
    signInPath:
      category === "auth_required" || category === "session_expired"
        ? buildSignInPath(commercialReturnPath(projectId))
        : undefined,
  };
}

function detectVersionMismatch(
  plan: WebsitePlanProjection | null,
  quote: QuoteProjection | null,
  offer: CommercialOfferProjection | null,
): boolean {
  if (!plan || !quote || !offer) return false;
  return (
    quote.planVersionId !== plan.planVersionId ||
    offer.planVersionId !== plan.planVersionId ||
    offer.quoteVersionId !== quote.quoteVersionId
  );
}

export async function loadCommercialSnapshot(
  projectId: string,
): Promise<CommercialPageLoadResult> {
  const deps = await gatewayDeps();
  const [resumeResult, planResult, quoteResult, offerResult] = await Promise.all([
    getProjectResumeDetail(projectId, deps),
    getWebsitePlan(projectId, deps),
    getProjectQuote(projectId, deps),
    getCommercialOffer(projectId, deps),
  ]);

  for (const result of [resumeResult, planResult, quoteResult, offerResult]) {
    if (!result.ok) {
      if (
        result.category === "auth_required" ||
        result.category === "session_expired"
      ) {
        return {
          status: "reauth",
          message: mapFactoryCategoryToUserMessage(result.category),
          signInPath: buildSignInPath(commercialReturnPath(projectId)),
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
  }

  if (!resumeResult.ok || !planResult.ok || !quoteResult.ok || !offerResult.ok) {
    return {
      status: "error",
      category: "internal_error",
      message: mapFactoryCategoryToUserMessage("internal_error"),
    };
  }

  const plan = planResult.data.plan;
  const quote = quoteResult.data.quote;
  const quoteReason =
    quoteResult.data.quote === null ? quoteResult.data.reason : null;
  const offer = offerResult.data.offer;
  const offerReason =
    offerResult.data.offer === null ? offerResult.data.reason : null;

  return {
    status: "success",
    snapshot: {
      resume: resumeResult.data,
      plan,
      quote,
      quoteReason,
      offer,
      offerReason,
      needInfo: offerResult.data.needInfo,
      consultationRequired: offerResult.data.consultationRequired,
      decline: offerResult.data.decline,
      versionMismatch: detectVersionMismatch(plan, quote, offer),
    },
  };
}

export async function loadCommercialPageData(
  projectId: string,
): Promise<CommercialPageLoadResult> {
  return loadCommercialSnapshot(projectId);
}

export async function reloadCommercialSnapshotAction(
  projectId: string,
): Promise<CommercialMutationResult> {
  const result = await loadCommercialSnapshot(projectId);
  if (result.status === "reauth") {
    return {
      ok: false,
      category: "session_expired",
      message: result.message,
      signInPath: result.signInPath,
    };
  }
  if (result.status === "not_found") {
    return {
      ok: false,
      category: "not_found",
      message: mapFactoryCategoryToUserMessage("not_found"),
    };
  }
  if (result.status === "error") {
    return {
      ok: false,
      category: result.category,
      message: result.message,
    };
  }
  return { ok: true, snapshot: result.snapshot, replayed: false };
}

export async function reapproveCommercialOfferAction(
  projectId: string,
  intent: {
    offerVersionId: string;
    operationId: string;
    correlationId: string;
    expectedOfferVersion: number;
  },
): Promise<CommercialMutationResult> {
  const result = await reapproveCommercialOffer(
    projectId,
    intent.offerVersionId,
    {
      operationId: intent.operationId,
      correlationId: intent.correlationId,
      expectedOfferVersion: intent.expectedOfferVersion,
    },
    await gatewayDeps(),
  );
  if (!result.ok) {
    return mutationFailure(result.category, projectId);
  }

  const reload = await loadCommercialSnapshot(projectId);
  if (reload.status !== "success") {
    if (reload.status === "reauth") {
      return {
        ok: false,
        category: "session_expired",
        message: reload.message,
        signInPath: reload.signInPath,
      };
    }
    if (reload.status === "not_found") {
      return mutationFailure("not_found", projectId);
    }
    return mutationFailure(reload.category, projectId);
  }

  return {
    ok: true,
    snapshot: reload.snapshot,
    replayed: result.data.replayed,
  };
}

export async function respondCommercialNeedInfoAction(
  projectId: string,
  intent: {
    blockerId: string;
    operationId: string;
    correlationId: string;
    expectedBlockerVersion: number;
    responseText: string;
  },
): Promise<CommercialMutationResult> {
  const result = await respondCommercialNeedInfo(
    projectId,
    intent.blockerId,
    {
      operationId: intent.operationId,
      correlationId: intent.correlationId,
      expectedBlockerVersion: intent.expectedBlockerVersion,
      responseText: intent.responseText,
    },
    await gatewayDeps(),
  );
  if (!result.ok) {
    return mutationFailure(result.category, projectId);
  }

  const reload = await loadCommercialSnapshot(projectId);
  if (reload.status !== "success") {
    if (reload.status === "reauth") {
      return {
        ok: false,
        category: "session_expired",
        message: reload.message,
        signInPath: reload.signInPath,
      };
    }
    if (reload.status === "not_found") {
      return mutationFailure("not_found", projectId);
    }
    return mutationFailure(reload.category, projectId);
  }

  return {
    ok: true,
    snapshot: reload.snapshot,
    replayed: result.data.replayed,
  };
}
