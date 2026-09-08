"use server";

import { buildSignInPath } from "@/lib/auth/safe-return-path";
import {
  mapFactoryCategoryToUserMessage,
  type DepositCheckoutSuccess,
  type DepositPaymentStatusProjection,
  type FactoryErrorCategory,
} from "@/lib/factory/contract";
import {
  getDepositPayment,
  initiateDepositCheckout,
} from "@/lib/factory/gateway";
import { getVerifiedAccessToken } from "@/lib/supabase/server";

export type DepositPaymentLoadResult =
  | { status: "success"; payment: DepositPaymentStatusProjection }
  | { status: "reauth"; message: string; signInPath: string }
  | {
      status: "error";
      category: FactoryErrorCategory;
      message: string;
    };

export type DepositCheckoutActionResult =
  | { ok: true; checkout: DepositCheckoutSuccess }
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

function paymentReturnPath(projectId: string, kind: "return" | "cancel"): string {
  return `/projects/${encodeURIComponent(projectId)}/deposit/${kind}`;
}

function paymentPermissionMessage(category: FactoryErrorCategory): string {
  if (category === "permission_denied") {
    return "You don’t have permission to start this payment. Ask an account owner or administrator.";
  }
  return mapFactoryCategoryToUserMessage(category);
}

/**
 * Load deposit-payment status. Failures are bounded and must not wipe
 * the surrounding Proposal & Pricing page.
 */
export async function loadDepositPaymentStatus(
  projectId: string,
): Promise<DepositPaymentLoadResult> {
  const deps = await gatewayDeps();
  const token = await getVerifiedAccessToken();
  if (!token) {
    return {
      status: "reauth",
      message: mapFactoryCategoryToUserMessage("auth_required"),
      signInPath: buildSignInPath(`/portal/projects/${encodeURIComponent(projectId)}/commercial`),
    };
  }

  const result = await getDepositPayment(projectId, deps);
  if (!result.ok) {
    if (result.category === "auth_required" || result.category === "session_expired") {
      return {
        status: "reauth",
        message: mapFactoryCategoryToUserMessage(result.category),
        signInPath: buildSignInPath(
          `/portal/projects/${encodeURIComponent(projectId)}/commercial`,
        ),
      };
    }
    return {
      status: "error",
      category: result.category,
      message: mapFactoryCategoryToUserMessage(result.category),
    };
  }

  return { status: "success", payment: result.data };
}

/** Server action for client payment panel refresh / polling. */
export async function loadDepositPaymentStatusAction(
  projectId: string,
): Promise<DepositPaymentLoadResult> {
  return loadDepositPaymentStatus(projectId);
}

/**
 * Load deposit-payment for Stripe return/cancel routes.
 * Auth failures redirect via reauth to the same deposit return path.
 */
export async function loadDepositPaymentForReturn(
  projectId: string,
  kind: "return" | "cancel",
): Promise<DepositPaymentLoadResult> {
  const deps = await gatewayDeps();
  const token = await getVerifiedAccessToken();
  if (!token) {
    return {
      status: "reauth",
      message: mapFactoryCategoryToUserMessage("auth_required"),
      signInPath: buildSignInPath(paymentReturnPath(projectId, kind)),
    };
  }

  const result = await getDepositPayment(projectId, deps);
  if (!result.ok) {
    if (result.category === "auth_required" || result.category === "session_expired") {
      return {
        status: "reauth",
        message: mapFactoryCategoryToUserMessage(result.category),
        signInPath: buildSignInPath(paymentReturnPath(projectId, kind)),
      };
    }
    return {
      status: "error",
      category: result.category,
      message: mapFactoryCategoryToUserMessage(result.category),
    };
  }

  return { status: "success", payment: result.data };
}

export async function initiateDepositCheckoutAction(
  projectId: string,
  operationId: string,
  correlationId: string,
): Promise<DepositCheckoutActionResult> {
  const deps = await gatewayDeps();
  const token = await getVerifiedAccessToken();
  if (!token) {
    return {
      ok: false,
      category: "auth_required",
      message: mapFactoryCategoryToUserMessage("auth_required"),
      signInPath: buildSignInPath(
        `/portal/projects/${encodeURIComponent(projectId)}/commercial`,
      ),
    };
  }

  const result = await initiateDepositCheckout(
    projectId,
    { operationId, correlationId },
    deps,
  );

  if (!result.ok) {
    return {
      ok: false,
      category: result.category,
      message: paymentPermissionMessage(result.category),
      signInPath:
        result.category === "auth_required" || result.category === "session_expired"
          ? buildSignInPath(
              `/portal/projects/${encodeURIComponent(projectId)}/commercial`,
            )
          : undefined,
    };
  }

  return { ok: true, checkout: result.data };
}
