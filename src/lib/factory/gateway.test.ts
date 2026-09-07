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

describe("Project asset gateway", () => {
  const projectId = "00000000-0000-4000-8000-000000000013";
  const assetId = "00000000-0000-4000-8000-0000000000a1";
  const correlationId = "00000000-0000-4000-8000-000000000099";

  const asset = {
    id: assetId,
    origin: "CUSTOMER_UPLOAD",
    assetKind: "IMAGE",
    lifecycleState: "AVAILABLE",
    validationState: "VALID",
    rightsState: "CUSTOMER_PROJECT_USE_AUTHORIZED",
    originalFilename: "logo.png",
    declaredContentType: "image/png",
    declaredByteSize: 1024,
    validatedContentType: "image/png",
    validatedByteSize: 1024,
    contentHash: null,
    version: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    availableAt: "2026-01-01T00:00:00.000Z",
    failedAt: null,
  };

  const deps = () => ({
    getAccessToken: async () => "access-token",
    getGatewayBaseUrl: () => "http://127.0.0.1:3001",
  });

  it("GETs project assets with exact path and bearer", async () => {
    const { listProjectAssets } = await import("./gateway");
    const fetchImpl = mockFetch(
      new Response(JSON.stringify({ ok: true, projectId, assets: [asset] }), {
        status: 200,
      }),
    );

    const result = await listProjectAssets(projectId, { ...deps(), fetchImpl });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.assets).toHaveLength(1);
      expect(result.data.assets[0]).not.toHaveProperty("object_key");
    }
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`http://127.0.0.1:3001/api/v1/projects/${projectId}/assets`);
    expect(init.method).toBe("GET");
    expect(init.cache).toBe("no-store");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer access-token",
      "Content-Type": "application/json",
    });
  });

  it("POSTs upload intent with exact path and metadata-only body", async () => {
    const { createProjectAssetUploadIntent } = await import("./gateway");
    const fetchImpl = mockFetch(
      new Response(
        JSON.stringify({
          ok: true,
          replayed: false,
          projectId,
          asset: { ...asset, lifecycleState: "PENDING_UPLOAD" },
          upload: {
            provider: "SUPABASE",
            bucket: "project-assets",
            path: `projects/${projectId}/${assetId}`,
            token: "signed-token",
            expiresAt: "2026-01-01T00:05:00.000Z",
          },
        }),
        { status: 200 },
      ),
    );

    const body = {
      operationId: "00000000-0000-4000-8000-0000000000b1",
      correlationId,
      originalFilename: "logo.png",
      contentType: "image/png",
      byteSize: 1024,
    };

    const result = await createProjectAssetUploadIntent(projectId, body, {
      ...deps(),
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `http://127.0.0.1:3001/api/v1/projects/${projectId}/assets/upload-intent`,
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(body);
  });

  it("accepts the Supabase upload capability path and token", async () => {
    const { createProjectAssetUploadIntent } = await import("./gateway");
    const fetchImpl = mockFetch(
      new Response(
        JSON.stringify({
          ok: true,
          replayed: true,
          projectId,
          asset: { ...asset, lifecycleState: "PENDING_UPLOAD" },
          upload: {
            provider: "SUPABASE",
            bucket: "project-assets",
            path: "projects/abc/def.png",
            token: "signed-token",
            expiresAt: null,
          },
        }),
        { status: 200 },
      ),
    );

    const result = await createProjectAssetUploadIntent(
      projectId,
      {
        operationId: "00000000-0000-4000-8000-0000000000b2",
        correlationId,
        originalFilename: "logo.png",
        contentType: "image/png",
        byteSize: 1024,
      },
      { ...deps(), fetchImpl },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.upload).toEqual({
        provider: "SUPABASE",
        bucket: "project-assets",
        path: "projects/abc/def.png",
        token: "signed-token",
        expiresAt: null,
      });
      expect(result.data.replayed).toBe(true);
    }
  });

  it("POSTs complete with exact path and body", async () => {
    const { completeProjectAssetUpload } = await import("./gateway");
    const fetchImpl = mockFetch(
      new Response(
        JSON.stringify({ ok: true, replayed: false, projectId, asset }),
        { status: 200 },
      ),
    );

    const body = {
      operationId: "00000000-0000-4000-8000-0000000000b3",
      correlationId,
      expectedVersion: 1,
    };

    const result = await completeProjectAssetUpload(projectId, assetId, body, {
      ...deps(),
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.asset.lifecycleState).toBe("AVAILABLE");
    }
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `http://127.0.0.1:3001/api/v1/projects/${projectId}/assets/${assetId}/complete`,
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(body);
  });

  it("POSTs read intent with exact path and body", async () => {
    const { createProjectAssetReadIntent } = await import("./gateway");
    const fetchImpl = mockFetch(
      new Response(
        JSON.stringify({
          ok: true,
          replayed: false,
          projectId,
          assetId,
          read: {
            url: "https://storage.example/signed/logo.png",
            expiresAt: "2026-01-01T00:05:00.000Z",
          },
        }),
        { status: 200 },
      ),
    );

    const body = {
      operationId: "00000000-0000-4000-8000-0000000000b4",
      correlationId,
    };

    const result = await createProjectAssetReadIntent(projectId, assetId, body, {
      ...deps(),
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `http://127.0.0.1:3001/api/v1/projects/${projectId}/assets/${assetId}/read-intent`,
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(body);
  });

  it("accepts the read capability url and expiry", async () => {
    const { createProjectAssetReadIntent } = await import("./gateway");
    const fetchImpl = mockFetch(
      new Response(
        JSON.stringify({
          ok: true,
          replayed: false,
          projectId,
          assetId,
          read: {
            url: "https://storage.example/signed/logo.png?token=abc",
            expiresAt: "2026-01-01T00:05:00.000Z",
          },
        }),
        { status: 200 },
      ),
    );

    const result = await createProjectAssetReadIntent(
      projectId,
      assetId,
      {
        operationId: "00000000-0000-4000-8000-0000000000b5",
        correlationId,
      },
      { ...deps(), fetchImpl },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.read.url).toBe(
        "https://storage.example/signed/logo.png?token=abc",
      );
      expect(result.data.read.expiresAt).toBe("2026-01-01T00:05:00.000Z");
      expect(result.data.read).not.toHaveProperty("object_key");
    }
  });

  it("POSTs remove with exact path and body", async () => {
    const { removeProjectAsset } = await import("./gateway");
    const fetchImpl = mockFetch(
      new Response(
        JSON.stringify({
          ok: true,
          replayed: false,
          projectId,
          asset: { ...asset, lifecycleState: "REMOVAL_PENDING", version: 2 },
        }),
        { status: 200 },
      ),
    );

    const body = {
      operationId: "00000000-0000-4000-8000-0000000000b6",
      correlationId,
      expectedVersion: 1,
    };

    const result = await removeProjectAsset(projectId, assetId, body, {
      ...deps(),
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.asset.lifecycleState).toBe("REMOVAL_PENDING");
    }
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `http://127.0.0.1:3001/api/v1/projects/${projectId}/assets/${assetId}/remove`,
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(body);
  });

  it("POSTs both rights decisions with exact path and body", async () => {
    const { updateProjectAssetRights } = await import("./gateway");
    const expectedRightsState = {
      CONFIRM_PROJECT_USE: "CUSTOMER_CONFIRMED_PROJECT_USE",
      DO_NOT_USE: "DO_NOT_USE",
    } as const;

    for (const decision of ["CONFIRM_PROJECT_USE", "DO_NOT_USE"] as const) {
      const fetchImpl = mockFetch(
        new Response(
          JSON.stringify({
            ok: true,
            replayed: false,
            projectId,
            asset: {
              ...asset,
              origin: "PUBLICLY_DISCOVERED",
              rightsState: expectedRightsState[decision],
              version: 2,
            },
          }),
          { status: 200 },
        ),
      );

      const body = {
        operationId:
          decision === "CONFIRM_PROJECT_USE"
            ? "00000000-0000-4000-8000-0000000000c1"
            : "00000000-0000-4000-8000-0000000000c2",
        correlationId,
        expectedVersion: 1,
        decision,
      };

      const result = await updateProjectAssetRights(projectId, assetId, body, {
        ...deps(),
        fetchImpl,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.asset.rightsState).toBe(expectedRightsState[decision]);
      }
      const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://127.0.0.1:3001/api/v1/projects/${projectId}/assets/${assetId}/rights`,
      );
      expect(init.method).toBe("POST");
      expect(JSON.parse(String(init.body))).toEqual(body);
    }
  });

  it("rejects malformed asset success payloads as internal_error", async () => {
    const { listProjectAssets, completeProjectAssetUpload } = await import(
      "./gateway"
    );

    const listFetch = mockFetch(
      new Response(JSON.stringify({ ok: true, projectId: "bad", assets: [] }), {
        status: 200,
      }),
    );
    const listResult = await listProjectAssets(projectId, {
      ...deps(),
      fetchImpl: listFetch,
    });
    expect(listResult.ok).toBe(false);
    if (!listResult.ok) expect(listResult.category).toBe("internal_error");

    const completeFetch = mockFetch(
      new Response(
        JSON.stringify({
          ok: true,
          replayed: false,
          projectId,
          asset: { ...asset, lifecycleState: "NOT_A_STATE" },
        }),
        { status: 200 },
      ),
    );
    const completeResult = await completeProjectAssetUpload(
      projectId,
      assetId,
      {
        operationId: "00000000-0000-4000-8000-0000000000b7",
        correlationId,
        expectedVersion: 1,
      },
      { ...deps(), fetchImpl: completeFetch },
    );
    expect(completeResult.ok).toBe(false);
    if (!completeResult.ok) {
      expect(completeResult.category).toBe("internal_error");
    }
  });

  it("does not require object_key on the customer asset projection", async () => {
    const { projectAssetSchema } = await import("./contract");
    const parsed = projectAssetSchema.parse(asset);
    expect(parsed.id).toBe(assetId);
    expect(parsed).not.toHaveProperty("object_key");
    expect(
      Object.keys(projectAssetSchema.shape).some((key) =>
        key.toLowerCase().includes("object"),
      ),
    ).toBe(false);
  });

  it("drops any leaked object_key from a parsed asset projection", async () => {
    const { listProjectAssets } = await import("./gateway");
    const fetchImpl = mockFetch(
      new Response(
        JSON.stringify({
          ok: true,
          projectId,
          assets: [{ ...asset, object_key: "projects/secret/path.png" }],
        }),
        { status: 200 },
      ),
    );

    const result = await listProjectAssets(projectId, { ...deps(), fetchImpl });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.assets[0]).not.toHaveProperty("object_key");
      expect(JSON.stringify(result.data)).not.toContain("secret");
    }
  });

  it("preserves frozen error categories across asset routes", async () => {
    const {
      listProjectAssets,
      createProjectAssetUploadIntent,
      completeProjectAssetUpload,
      createProjectAssetReadIntent,
      removeProjectAsset,
      updateProjectAssetRights,
    } = await import("./gateway");

    const cases = [
      ["not_found", 404],
      ["permission_denied", 403],
      ["invalid_input", 400],
      ["stale_or_conflicting", 409],
      ["already_completed", 409],
      ["temporary_failure", 503],
      ["internal_error", 500],
      ["session_expired", 401],
    ] as const;

    for (const [category, status] of cases) {
      // Each route consumes its own Response body, so build a fresh one per call.
      const fetchImpl = vi.fn().mockImplementation(
        async () =>
          new Response(
            JSON.stringify({ ok: false, error: { category, message: "Hidden" } }),
            { status },
          ),
      );
      const gatewayDeps = { ...deps(), fetchImpl };

      const results = [
        await listProjectAssets(projectId, gatewayDeps),
        await createProjectAssetUploadIntent(
          projectId,
          {
            operationId: "00000000-0000-4000-8000-0000000000d1",
            correlationId,
            originalFilename: "logo.png",
            contentType: "image/png",
            byteSize: 1024,
          },
          gatewayDeps,
        ),
        await completeProjectAssetUpload(
          projectId,
          assetId,
          {
            operationId: "00000000-0000-4000-8000-0000000000d2",
            correlationId,
            expectedVersion: 1,
          },
          gatewayDeps,
        ),
        await createProjectAssetReadIntent(
          projectId,
          assetId,
          {
            operationId: "00000000-0000-4000-8000-0000000000d3",
            correlationId,
          },
          gatewayDeps,
        ),
        await removeProjectAsset(
          projectId,
          assetId,
          {
            operationId: "00000000-0000-4000-8000-0000000000d4",
            correlationId,
            expectedVersion: 1,
          },
          gatewayDeps,
        ),
        await updateProjectAssetRights(
          projectId,
          assetId,
          {
            operationId: "00000000-0000-4000-8000-0000000000d5",
            correlationId,
            expectedVersion: 1,
            decision: "CONFIRM_PROJECT_USE",
          },
          gatewayDeps,
        ),
      ];

      for (const result of results) {
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.category).toBe(category);
          expect(result.message).toBe("Hidden");
        }
      }
    }
  });

  it("returns auth_required for asset routes without an access token", async () => {
    const { listProjectAssets, updateProjectAssetRights } = await import(
      "./gateway"
    );
    const fetchImpl = mockFetch(new Response("{}", { status: 200 }));

    const listResult = await listProjectAssets(projectId, {
      fetchImpl,
      getAccessToken: async () => null,
      getGatewayBaseUrl: () => "http://127.0.0.1:3001",
    });
    const rightsResult = await updateProjectAssetRights(
      projectId,
      assetId,
      {
        operationId: "00000000-0000-4000-8000-0000000000d6",
        correlationId,
        expectedVersion: 1,
        decision: "DO_NOT_USE",
      },
      {
        fetchImpl,
        getAccessToken: async () => null,
        getGatewayBaseUrl: () => "http://127.0.0.1:3001",
      },
    );

    for (const result of [listResult, rightsResult]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.category).toBe("auth_required");
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a tampered rights decision before calling Factory", async () => {
    const { updateProjectAssetRights } = await import("./gateway");
    const fetchImpl = mockFetch(new Response("{}", { status: 200 }));

    await expect(
      updateProjectAssetRights(
        projectId,
        assetId,
        {
          operationId: "00000000-0000-4000-8000-0000000000d7",
          correlationId,
          expectedVersion: 1,
          decision: "TAMPERED" as never,
        },
        { ...deps(), fetchImpl },
      ),
    ).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("Project asset gateway", () => {
  const projectId = "00000000-0000-4000-8000-000000000013";
  const assetId = "00000000-0000-4000-8000-0000000000a1";
  const op = "00000000-0000-4000-8000-0000000000b1";
  const corr = "00000000-0000-4000-8000-0000000000b2";

  const sampleAsset = {
    id: assetId,
    origin: "CUSTOMER_UPLOAD",
    assetKind: "IMAGE",
    lifecycleState: "AVAILABLE",
    validationState: "VALID",
    rightsState: "CUSTOMER_PROJECT_USE_AUTHORIZED",
    originalFilename: "logo.png",
    declaredContentType: "image/png",
    declaredByteSize: 1024,
    validatedContentType: "image/png",
    validatedByteSize: 1024,
    contentHash: null,
    version: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    availableAt: "2026-01-01T00:00:00.000Z",
    failedAt: null,
  };

  const deps = {
    getAccessToken: async () => "access-token",
    getGatewayBaseUrl: () => "http://127.0.0.1:3001",
  };

  it("GETs project assets with exact path and bearer", async () => {
    const { listProjectAssets } = await import("./gateway");
    const body = { ok: true, projectId, assets: [sampleAsset] };
    const fetchImpl = mockFetch(new Response(JSON.stringify(body), { status: 200 }));
    const result = await listProjectAssets(projectId, { ...deps, fetchImpl });
    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`http://127.0.0.1:3001/api/v1/projects/${projectId}/assets`);
    expect(init.method).toBe("GET");
    expect(init.cache).toBe("no-store");
    expect(init.headers).toMatchObject({ Authorization: "Bearer access-token" });
    if (result.ok) {
      expect(result.data.assets[0]).not.toHaveProperty("object_key");
      expect(result.data.assets[0]).not.toHaveProperty("objectKey");
    }
  });

  it("POSTs upload-intent with metadata-only body", async () => {
    const { createProjectAssetUploadIntent } = await import("./gateway");
    const success = {
      ok: true,
      replayed: false,
      projectId,
      asset: { ...sampleAsset, lifecycleState: "PENDING_UPLOAD", validationState: "UNVALIDATED", availableAt: null },
      upload: {
        provider: "SUPABASE",
        bucket: "fp-project-assets",
        path: "projects/p/a/object",
        token: "signed-token",
        expiresAt: "2026-01-01T00:05:00.000Z",
      },
    };
    const fetchImpl = mockFetch(new Response(JSON.stringify(success), { status: 200 }));
    const request = {
      operationId: op,
      correlationId: corr,
      originalFilename: "logo.png",
      contentType: "image/png",
      byteSize: 1024,
    };
    const result = await createProjectAssetUploadIntent(projectId, request, {
      ...deps,
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `http://127.0.0.1:3001/api/v1/projects/${projectId}/assets/upload-intent`,
    );
    expect(JSON.parse(String(init.body))).toEqual(request);
    expect(JSON.parse(String(init.body))).not.toHaveProperty("file");
  });

  it("POSTs complete, read-intent, remove, and rights with exact paths", async () => {
    const {
      completeProjectAssetUpload,
      createProjectAssetReadIntent,
      removeProjectAsset,
      updateProjectAssetRights,
    } = await import("./gateway");

    const completeBody = { operationId: op, correlationId: corr, expectedVersion: 1 };
    const completeFetch = mockFetch(
      new Response(JSON.stringify({ ok: true, replayed: false, projectId, asset: sampleAsset }), {
        status: 200,
      }),
    );
    await completeProjectAssetUpload(projectId, assetId, completeBody, {
      ...deps,
      fetchImpl: completeFetch,
    });
    expect((completeFetch.mock.calls[0] as [string])[0]).toBe(
      `http://127.0.0.1:3001/api/v1/projects/${projectId}/assets/${assetId}/complete`,
    );
    expect(JSON.parse(String((completeFetch.mock.calls[0] as [string, RequestInit])[1].body))).toEqual(
      completeBody,
    );

    const readBody = { operationId: op, correlationId: corr };
    const readFetch = mockFetch(
      new Response(
        JSON.stringify({
          ok: true,
          replayed: false,
          projectId,
          assetId,
          read: { url: "https://signed.example/read", expiresAt: "2026-01-01T00:05:00.000Z" },
        }),
        { status: 200 },
      ),
    );
    const readResult = await createProjectAssetReadIntent(projectId, assetId, readBody, {
      ...deps,
      fetchImpl: readFetch,
    });
    expect(readResult.ok).toBe(true);
    expect((readFetch.mock.calls[0] as [string])[0]).toBe(
      `http://127.0.0.1:3001/api/v1/projects/${projectId}/assets/${assetId}/read-intent`,
    );

    const removeFetch = mockFetch(
      new Response(
        JSON.stringify({
          ok: true,
          replayed: false,
          projectId,
          asset: { ...sampleAsset, lifecycleState: "REMOVED", version: 3 },
        }),
        { status: 200 },
      ),
    );
    await removeProjectAsset(
      projectId,
      assetId,
      { operationId: op, correlationId: corr, expectedVersion: 1 },
      { ...deps, fetchImpl: removeFetch },
    );
    expect((removeFetch.mock.calls[0] as [string])[0]).toBe(
      `http://127.0.0.1:3001/api/v1/projects/${projectId}/assets/${assetId}/remove`,
    );

    for (const decision of ["CONFIRM_PROJECT_USE", "DO_NOT_USE"] as const) {
      const rightsFetch = mockFetch(
        new Response(
          JSON.stringify({ ok: true, replayed: false, projectId, asset: sampleAsset }),
          { status: 200 },
        ),
      );
      const rightsBody = {
        operationId: op,
        correlationId: corr,
        expectedVersion: 1,
        decision,
      };
      await updateProjectAssetRights(projectId, assetId, rightsBody, {
        ...deps,
        fetchImpl: rightsFetch,
      });
      expect((rightsFetch.mock.calls[0] as [string])[0]).toBe(
        `http://127.0.0.1:3001/api/v1/projects/${projectId}/assets/${assetId}/rights`,
      );
      expect(
        JSON.parse(String((rightsFetch.mock.calls[0] as [string, RequestInit])[1].body)),
      ).toEqual(rightsBody);
    }
  });

  it("rejects malformed asset list as internal_error", async () => {
    const { listProjectAssets } = await import("./gateway");
    const fetchImpl = mockFetch(
      new Response(JSON.stringify({ ok: true, projectId: "bad" }), { status: 200 }),
    );
    const result = await listProjectAssets(projectId, { ...deps, fetchImpl });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.category).toBe("internal_error");
  });

  it("returns auth_required without calling fetch when no token", async () => {
    const { listProjectAssets } = await import("./gateway");
    const fetchImpl = mockFetch(new Response("{}", { status: 200 }));
    const result = await listProjectAssets(projectId, {
      fetchImpl,
      getAccessToken: async () => null,
      getGatewayBaseUrl: () => "http://127.0.0.1:3001",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.category).toBe("auth_required");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

const websitePlanFixture = {
  projectId: "00000000-0000-4000-8000-000000000013",
  planId: "00000000-0000-4000-8000-000000000020",
  planVersion: 1,
  planVersionId: "00000000-0000-4000-8000-000000000021",
  headerVersion: 1,
  confirmed: false,
  businessUnderstanding: "Bakery",
  websiteGoals: ["Leads"],
  packageCategory: "ESSENTIAL",
  packageRationale: "ESSENTIAL:default_marketing_envelope",
  pages: [{ key: "home", title: "Home", origin: "FP_RECOMMENDED" }],
  requiredFunctionality: [],
  modules: [],
  customRequirements: [],
  designDirection: "Warm",
  availableContentNotes: "",
  missingContentNotes: "",
  assetReferences: [],
  customerFacingAssumptions: [],
  customerSafeAttention: [],
  assemblyStatus: "READY",
  classificationAttention: [],
};

describe("B3-P1 website plan gateway methods", () => {
  const projectId = "00000000-0000-4000-8000-000000000013";
  const depsBase = {
    getAccessToken: async () => "access-token",
    getGatewayBaseUrl: () => "http://127.0.0.1:3001",
  };

  it("GETs website plan with bearer and no-store", async () => {
    const { getWebsitePlan } = await import("./gateway");
    const fetchImpl = mockFetch(
      new Response(JSON.stringify({ ok: true, plan: null }), { status: 200 }),
    );
    const result = await getWebsitePlan(projectId, { ...depsBase, fetchImpl });
    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "http://127.0.0.1:3001/api/v1/projects/00000000-0000-4000-8000-000000000013/website-plan",
    );
    expect(init.method).toBe("GET");
    expect(init.cache).toBe("no-store");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer access-token",
    });
  });

  it("POSTs assemble with exact body", async () => {
    const { assembleWebsitePlan } = await import("./gateway");
    const fetchImpl = mockFetch(
      new Response(
        JSON.stringify({ ok: true, replayed: false, plan: websitePlanFixture }),
        { status: 200 },
      ),
    );
    const result = await assembleWebsitePlan(
      projectId,
      {
        operationId: "00000000-0000-4000-8000-000000000050",
        correlationId: "00000000-0000-4000-8000-000000000051",
      },
      { ...depsBase, fetchImpl },
    );
    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/website-plan/assemble");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      operationId: "00000000-0000-4000-8000-000000000050",
      correlationId: "00000000-0000-4000-8000-000000000051",
    });
  });

  it("POSTs revise and confirm with exact paths", async () => {
    const { reviseWebsitePlan, confirmWebsitePlan } = await import("./gateway");
    const reviseFetch = mockFetch(
      new Response(
        JSON.stringify({
          ok: true,
          replayed: false,
          plan: { ...websitePlanFixture, planVersion: 2 },
          requiredAction: "CUSTOMER",
        }),
        { status: 200 },
      ),
    );
    await reviseWebsitePlan(
      projectId,
      {
        operationId: "00000000-0000-4000-8000-000000000052",
        correlationId: "00000000-0000-4000-8000-000000000053",
        expectedPlanVersion: 1,
        revision: { addPages: [{ title: "About" }] },
      },
      { ...depsBase, fetchImpl: reviseFetch },
    );
    expect((reviseFetch.mock.calls[0] as [string])[0]).toContain(
      "/website-plan/revisions",
    );

    const confirmFetch = mockFetch(
      new Response(
        JSON.stringify({
          ok: true,
          replayed: false,
          plan: { ...websitePlanFixture, confirmed: true },
          requiredAction: "SYSTEM",
        }),
        { status: 200 },
      ),
    );
    await confirmWebsitePlan(
      projectId,
      websitePlanFixture.planVersionId,
      {
        operationId: "00000000-0000-4000-8000-000000000054",
        correlationId: "00000000-0000-4000-8000-000000000055",
        expectedPlanVersion: 1,
      },
      { ...depsBase, fetchImpl: confirmFetch },
    );
    expect((confirmFetch.mock.calls[0] as [string])[0]).toContain(
      `/website-plan/${websitePlanFixture.planVersionId}/confirm`,
    );
  });

  it("maps website-plan HTTP errors safely", async () => {
    const { getWebsitePlan, assembleWebsitePlan } = await import("./gateway");
    const cases = [
      [400, "invalid_input"],
      [401, "session_expired"],
      [403, "permission_denied"],
      [404, "not_found"],
      [409, "stale_or_conflicting"],
      [503, "temporary_failure"],
    ] as const;
    for (const [status, category] of cases) {
      const fetchImpl = mockFetch(new Response("{}", { status }));
      const result = await getWebsitePlan(projectId, {
        ...depsBase,
        fetchImpl,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.category).toBe(category);
    }

    const malformed = mockFetch(
      new Response(JSON.stringify({ ok: true, plan: { bad: true } }), {
        status: 200,
      }),
    );
    const bad = await assembleWebsitePlan(
      projectId,
      {
        operationId: "00000000-0000-4000-8000-000000000056",
        correlationId: "00000000-0000-4000-8000-000000000057",
      },
      { ...depsBase, fetchImpl: malformed },
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.category).toBe("internal_error");
  });
});
