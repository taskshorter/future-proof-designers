import { describe, expect, it, vi } from "vitest";

import {
  getProjectResumeDetail,
  listResumeProjects,
  startOrSaveProject,
} from "./gateway";

const successStart = {
  ok: true,
  replayed: false,
  alreadyCompleted: false,
  customerId: "00000000-0000-4000-8000-000000000010",
  businessId: "00000000-0000-4000-8000-000000000011",
  websiteId: "00000000-0000-4000-8000-000000000012",
  projectId: "00000000-0000-4000-8000-000000000013",
  intakeRecordId: "00000000-0000-4000-8000-000000000014",
};

function mockFetch(response: Response) {
  return vi.fn().mockResolvedValue(response);
}

describe("Factory gateway client", () => {
  it("sends exact start request shape with bearer token only", async () => {
    const fetchImpl = mockFetch(
      new Response(JSON.stringify(successStart), { status: 200 }),
    );

    const result = await startOrSaveProject(
      {
        operationId: "browser-op-1",
        correlationId: "00000000-0000-4000-8000-000000000001",
        answers: {
          hasExistingWebsite: false,
          existingWebsiteUrl: null,
          businessDescription: "We run a bakery.",
          thirdAnswer: "Find us online.",
        },
        targetCustomerId: null,
      },
      {
        fetchImpl,
        getAccessToken: async () => "access-token",
        getGatewayBaseUrl: () => "http://127.0.0.1:3001",
      },
    );

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:3001/api/v1/projects/start");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer access-token",
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      operationId: "browser-op-1",
      answers: {
        businessDescription: "We run a bakery.",
      },
    });
    if (result.ok) {
      expect(result.data).not.toHaveProperty("accessToken");
    }
  });

  it("maps all frozen error categories safely", async () => {
    const categories = [
      "not_found",
      "permission_denied",
      "invalid_input",
    ] as const;

    for (const category of categories) {
      const fetchImpl = mockFetch(
        new Response(
          JSON.stringify({ ok: false, error: { category, message: "Hidden" } }),
          { status: category === "not_found" ? 404 : category === "permission_denied" ? 403 : 400 },
        ),
      );

      const result = await getProjectResumeDetail(
        "00000000-0000-4000-8000-000000000013",
        {
          fetchImpl,
          getAccessToken: async () => "access-token",
          getGatewayBaseUrl: () => "http://127.0.0.1:3001",
        },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.category).toBe(category);
      }
    }
  });

  it("maps auth, stale, temporary, and malformed responses safely", async () => {
    const cases = [
      [{ category: "auth_required", message: "Auth" }, 401],
      [{ category: "session_expired", message: "Expired" }, 401],
      [{ category: "stale_or_conflicting", message: "Conflict" }, 409],
      [{ category: "temporary_failure", message: "Retry" }, 503],
      [{ ok: false, error: { category: "internal_error", message: "Fail" } }, 500],
      ["not-json", 500],
    ] as const;

    for (const [body, status] of cases) {
      const fetchImpl = mockFetch(
        new Response(typeof body === "string" ? body : JSON.stringify(body), {
          status,
        }),
      );

      const result = await startOrSaveProject(
        {
          operationId: "browser-op-1",
          correlationId: "00000000-0000-4000-8000-000000000001",
          answers: {
            hasExistingWebsite: false,
            existingWebsiteUrl: null,
            businessDescription: "Bakery",
            thirdAnswer: "Goal",
          },
          targetCustomerId: null,
        },
        {
          fetchImpl,
          getAccessToken: async () => "access-token",
          getGatewayBaseUrl: () => "http://127.0.0.1:3001",
          timeoutMs: 20,
        },
      );

      expect(result.ok).toBe(false);
    }
  });

  it("parses resume list and detail responses", async () => {
    const listFetch = mockFetch(
      new Response(
        JSON.stringify({
          ok: true,
          projects: [
            {
              projectId: "00000000-0000-4000-8000-000000000013",
              projectName: "Bakery Site",
              customerId: "00000000-0000-4000-8000-000000000010",
              customerName: "Bakery",
              businessId: "00000000-0000-4000-8000-000000000011",
              websiteId: "00000000-0000-4000-8000-000000000012",
              lifecycleState: "ONBOARDING",
              requiredAction: "CUSTOMER",
              commercialState: "NOT_REQUIRED",
              provisioningState: "NOT_REQUIRED",
              operationalHealth: "UNKNOWN",
              createdAt: "2026-04-01T00:00:00.000Z",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const list = await listResumeProjects({
      fetchImpl: listFetch,
      getAccessToken: async () => "token",
      getGatewayBaseUrl: () => "http://127.0.0.1:3001",
    });
    expect(list.ok).toBe(true);

    const detailFetch = mockFetch(
      new Response(
        JSON.stringify({
          ok: true,
          project: {
            projectId: "00000000-0000-4000-8000-000000000013",
            projectName: "Bakery Site",
            customerId: "00000000-0000-4000-8000-000000000010",
            customerName: "Bakery",
            businessId: "00000000-0000-4000-8000-000000000011",
            websiteId: "00000000-0000-4000-8000-000000000012",
            lifecycleState: "ONBOARDING",
            requiredAction: "CUSTOMER",
            commercialState: "NOT_REQUIRED",
            provisioningState: "NOT_REQUIRED",
            operationalHealth: "UNKNOWN",
            createdAt: "2026-04-01T00:00:00.000Z",
          },
          intake: null,
        }),
        { status: 200 },
      ),
    );

    const detail = await getProjectResumeDetail("00000000-0000-4000-8000-000000000013", {
      fetchImpl: detailFetch,
      getAccessToken: async () => "token",
      getGatewayBaseUrl: () => "http://127.0.0.1:3001",
    });

    expect(detail.ok).toBe(true);
    if (detail.ok) {
      expect(detail.data.intake).toBeNull();
    }
  });

  it("rejects unauthenticated callers before calling Factory", async () => {
    const fetchImpl = mockFetch(new Response("{}", { status: 500 }));
    const result = await startOrSaveProject(
      {
        operationId: "browser-op-1",
        correlationId: "00000000-0000-4000-8000-000000000001",
        answers: {
          hasExistingWebsite: false,
          existingWebsiteUrl: null,
          businessDescription: "Bakery",
          thirdAnswer: "Goal",
        },
        targetCustomerId: null,
      },
      {
        fetchImpl,
        getAccessToken: async () => null,
      },
    );

    expect(result).toEqual({
      ok: false,
      category: "auth_required",
      message: "Authentication required",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
