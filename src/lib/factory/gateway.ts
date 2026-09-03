import "server-only";

import { getServerEnv } from "@/lib/env/get-server-env";
import {
  factoryErrorResponseSchema,
  projectResumeDetailSuccessSchema,
  projectResumeListSuccessSchema,
  projectStartRequestSchema,
  projectStartSuccessSchema,
  type FactoryErrorCategory,
  type FactoryGatewayResult,
  type ProjectResumeDetail,
  type ProjectStartRequest,
  type ProjectStartSuccess,
  type ProjectResumeSummary,
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
