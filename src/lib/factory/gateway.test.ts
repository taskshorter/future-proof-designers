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

  it("GETs onboarding with exact path and parses success", async () => {
    const { getProjectOnboarding } = await import("./gateway");
    const body = {
      ok: true,
      projectId: "00000000-0000-4000-8000-000000000013",
      sections: [
        {
          sectionKey: "BUSINESS",
          status: "NOT_STARTED",
          version: 0,
          completedAt: null,
          updatedAt: null,
        },
        {
          sectionKey: "BRAND",
          status: "NOT_STARTED",
          version: 0,
          completedAt: null,
          updatedAt: null,
        },
        {
          sectionKey: "CONTENT",
          status: "NOT_STARTED",
          version: 0,
          completedAt: null,
          updatedAt: null,
        },
        {
          sectionKey: "GOALS",
          status: "NOT_STARTED",
          version: 0,
          completedAt: null,
          updatedAt: null,
        },
        {
          sectionKey: "REVIEW",
          status: "NOT_STARTED",
          version: 0,
          completedAt: null,
          updatedAt: null,
        },
      ],
      answers: [],
    };
    const fetchImpl = mockFetch(new Response(JSON.stringify(body), { status: 200 }));
    const result = await getProjectOnboarding("00000000-0000-4000-8000-000000000013", {
      fetchImpl,
      getAccessToken: async () => "access-token",
      getGatewayBaseUrl: () => "http://127.0.0.1:3001",
    });
    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "http://127.0.0.1:3001/api/v1/projects/00000000-0000-4000-8000-000000000013/onboarding",
    );
    expect(init.method).toBe("GET");
    expect(init.headers).toMatchObject({ Authorization: "Bearer access-token" });
  });

  it("PUTs onboarding section with exact path and body", async () => {
    const { saveProjectOnboardingSection } = await import("./gateway");
    const success = {
      ok: true,
      replayed: false,
      projectId: "00000000-0000-4000-8000-000000000013",
      sectionKey: "BUSINESS",
      status: "IN_PROGRESS",
      version: 1,
      completedAt: null,
      updatedAnswerFieldKeys: ["business.name"],
      removedFieldKeys: [],
    };
    const fetchImpl = mockFetch(new Response(JSON.stringify(success), { status: 200 }));
    const result = await saveProjectOnboardingSection(
      "00000000-0000-4000-8000-000000000013",
      "BUSINESS",
      {
        operationId: "op-1",
        correlationId: "00000000-0000-4000-8000-000000000099",
        expectedVersion: 0,
        status: "IN_PROGRESS",
        answers: { "business.name": "Taco Shop" },
        removeFieldKeys: [],
      },
      {
        fetchImpl,
        getAccessToken: async () => "access-token",
        getGatewayBaseUrl: () => "http://127.0.0.1:3001",
      },
    );
    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "http://127.0.0.1:3001/api/v1/projects/00000000-0000-4000-8000-000000000013/onboarding/sections/BUSINESS",
    );
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toMatchObject({
      operationId: "op-1",
      expectedVersion: 0,
      status: "IN_PROGRESS",
      answers: { "business.name": "Taco Shop" },
    });
  });

  it("rejects malformed onboarding success payloads", async () => {
    const { getProjectOnboarding } = await import("./gateway");
    const fetchImpl = mockFetch(
      new Response(JSON.stringify({ ok: true, projectId: "bad" }), { status: 200 }),
    );
    const result = await getProjectOnboarding("00000000-0000-4000-8000-000000000013", {
      fetchImpl,
      getAccessToken: async () => "access-token",
      getGatewayBaseUrl: () => "http://127.0.0.1:3001",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.category).toBe("internal_error");
    }
  });
});

describe("Factory research gateway", () => {
  const projectId = "00000000-0000-4000-8000-000000000013";
  const candidateId = "00000000-0000-4000-8000-0000000000aa";
  const runId = "00000000-0000-4000-8000-0000000000bb";
  const sourceId = "00000000-0000-4000-8000-0000000000cc";

  const researchSuccess = {
    ok: true,
    projectId,
    runs: [
      {
        id: runId,
        kind: "INITIAL_WHOLE_SITE",
        status: "SUCCEEDED",
        normalizedUrl: "https://example.com",
        failureClassification: null,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:01:00.000Z",
        startedAt: "2026-04-01T00:00:30.000Z",
        finishedAt: "2026-04-01T00:01:00.000Z",
      },
    ],
    sources: [
      {
        id: sourceId,
        researchRunId: runId,
        sourceUrl: "https://example.com/about",
        classification: "DISCOVERED",
        observedAt: "2026-04-01T00:00:45.000Z",
        safeMetadata: { title: "About" },
      },
    ],
    candidates: [
      {
        id: candidateId,
        researchRunId: runId,
        fieldKey: "business.name",
        extractedValue: "Example Co",
        derivation: "DISCOVERED",
        disposition: "PENDING",
        advisoryConfidence: 0.8,
        observedAt: "2026-04-01T00:00:50.000Z",
        sourceIds: [sourceId],
      },
    ],
  };

  const acceptSuccess = {
    ok: true,
    replayed: false,
    projectId,
    candidateId,
    disposition: "ACCEPTED",
    fieldKey: "business.name",
    sectionKey: "BUSINESS",
    sectionVersion: 2,
    answerVersion: 1,
    completedAt: null,
  };

  it("GETs project research with exact path and bearer", async () => {
    const { getProjectResearch } = await import("./gateway");
    const fetchImpl = mockFetch(new Response(JSON.stringify(researchSuccess), { status: 200 }));
    const result = await getProjectResearch(projectId, {
      fetchImpl,
      getAccessToken: async () => "access-token",
      getGatewayBaseUrl: () => "http://127.0.0.1:3001",
    });
    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`http://127.0.0.1:3001/api/v1/projects/${projectId}/research`);
    expect(init.method).toBe("GET");
    expect(init.cache).toBe("no-store");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer access-token",
      "Content-Type": "application/json",
    });
  });

  it("POSTs accept with exact path and body", async () => {
    const { acceptResearchCandidate } = await import("./gateway");
    const fetchImpl = mockFetch(new Response(JSON.stringify(acceptSuccess), { status: 200 }));
    const body = {
      operationId: "op-accept",
      correlationId: "00000000-0000-4000-8000-000000000099",
      expectedSectionVersion: 1,
    };
    const result = await acceptResearchCandidate(projectId, candidateId, body, {
      fetchImpl,
      getAccessToken: async () => "access-token",
      getGatewayBaseUrl: () => "http://127.0.0.1:3001",
    });
    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `http://127.0.0.1:3001/api/v1/projects/${projectId}/research/candidates/${candidateId}/accept`,
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(body);
  });

  it("POSTs edit with exact path and body", async () => {
    const { editResearchCandidate } = await import("./gateway");
    const success = { ...acceptSuccess, disposition: "EDITED" };
    const fetchImpl = mockFetch(new Response(JSON.stringify(success), { status: 200 }));
    const body = {
      operationId: "op-edit",
      correlationId: "00000000-0000-4000-8000-000000000099",
      expectedSectionVersion: 1,
      value: "Edited Name",
    };
    const result = await editResearchCandidate(projectId, candidateId, body, {
      fetchImpl,
      getAccessToken: async () => "access-token",
      getGatewayBaseUrl: () => "http://127.0.0.1:3001",
    });
    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `http://127.0.0.1:3001/api/v1/projects/${projectId}/research/candidates/${candidateId}/edit`,
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(body);
  });

  it("POSTs reject with exact path and body", async () => {
    const { rejectResearchCandidate } = await import("./gateway");
    const success = {
      ok: true,
      replayed: false,
      projectId,
      candidateId,
      disposition: "REJECTED",
    };
    const fetchImpl = mockFetch(new Response(JSON.stringify(success), { status: 200 }));
    const body = {
      operationId: "op-reject",
      correlationId: "00000000-0000-4000-8000-000000000099",
    };
    const result = await rejectResearchCandidate(projectId, candidateId, body, {
      fetchImpl,
      getAccessToken: async () => "access-token",
      getGatewayBaseUrl: () => "http://127.0.0.1:3001",
    });
    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `http://127.0.0.1:3001/api/v1/projects/${projectId}/research/candidates/${candidateId}/reject`,
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(body);
  });

  it("rejects malformed research success as internal_error", async () => {
    const { getProjectResearch } = await import("./gateway");
    const fetchImpl = mockFetch(
      new Response(JSON.stringify({ ok: true, projectId: "bad" }), { status: 200 }),
    );
    const result = await getProjectResearch(projectId, {
      fetchImpl,
      getAccessToken: async () => "access-token",
      getGatewayBaseUrl: () => "http://127.0.0.1:3001",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.category).toBe("internal_error");
  });

  it("preserves already_completed category", async () => {
    const { acceptResearchCandidate } = await import("./gateway");
    const fetchImpl = mockFetch(
      new Response(
        JSON.stringify({
          ok: false,
          error: { category: "already_completed", message: "Done" },
        }),
        { status: 409 },
      ),
    );
    const result = await acceptResearchCandidate(
      projectId,
      candidateId,
      {
        operationId: "op",
        correlationId: "00000000-0000-4000-8000-000000000099",
        expectedSectionVersion: 1,
      },
      {
        fetchImpl,
        getAccessToken: async () => "access-token",
        getGatewayBaseUrl: () => "http://127.0.0.1:3001",
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.category).toBe("already_completed");
  });

  it("preserves temporary_failure and stale_or_conflicting", async () => {
    const { acceptResearchCandidate } = await import("./gateway");
    for (const category of ["temporary_failure", "stale_or_conflicting"] as const) {
      const fetchImpl = mockFetch(
        new Response(
          JSON.stringify({ ok: false, error: { category, message: "x" } }),
          { status: category === "temporary_failure" ? 503 : 409 },
        ),
      );
      const result = await acceptResearchCandidate(
        projectId,
        candidateId,
        {
          operationId: "op",
          correlationId: "00000000-0000-4000-8000-000000000099",
          expectedSectionVersion: 1,
        },
        {
          fetchImpl,
          getAccessToken: async () => "access-token",
          getGatewayBaseUrl: () => "http://127.0.0.1:3001",
        },
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.category).toBe(category);
    }
  });

  it("returns auth_required when no access token", async () => {
    const { getProjectResearch } = await import("./gateway");
    const fetchImpl = mockFetch(new Response("{}", { status: 200 }));
    const result = await getProjectResearch(projectId, {
      fetchImpl,
      getAccessToken: async () => null,
      getGatewayBaseUrl: () => "http://127.0.0.1:3001",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.category).toBe("auth_required");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps timeout to temporary_failure", async () => {
    const { getProjectResearch } = await import("./gateway");
    const fetchImpl = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init.signal;
        if (signal) {
          signal.addEventListener("abort", () => {
            const error = new Error("Aborted");
            error.name = "AbortError";
            reject(error);
          });
        }
      });
    });
    const result = await getProjectResearch(projectId, {
      fetchImpl,
      getAccessToken: async () => "access-token",
      getGatewayBaseUrl: () => "http://127.0.0.1:3001",
      timeoutMs: 5,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.category).toBe("temporary_failure");
  });
});
