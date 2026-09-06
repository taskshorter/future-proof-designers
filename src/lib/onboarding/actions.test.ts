import { beforeEach, describe, expect, it, vi } from "vitest";

const getVerifiedAccessToken = vi.fn();
const getProjectResumeDetail = vi.fn();
const getProjectOnboarding = vi.fn();
const getProjectResearch = vi.fn();
const acceptResearchCandidate = vi.fn();
const editResearchCandidate = vi.fn();
const rejectResearchCandidate = vi.fn();
const saveProjectOnboardingSection = vi.fn();
const listProjectAssets = vi.fn();
const createProjectAssetUploadIntent = vi.fn();
const completeProjectAssetUpload = vi.fn();
const createProjectAssetReadIntent = vi.fn();
const removeProjectAsset = vi.fn();
const updateProjectAssetRights = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getVerifiedAccessToken: () => getVerifiedAccessToken(),
}));

vi.mock("@/lib/factory/gateway", () => ({
  getProjectResumeDetail: (...args: unknown[]) => getProjectResumeDetail(...args),
  getProjectOnboarding: (...args: unknown[]) => getProjectOnboarding(...args),
  getProjectResearch: (...args: unknown[]) => getProjectResearch(...args),
  acceptResearchCandidate: (...args: unknown[]) => acceptResearchCandidate(...args),
  editResearchCandidate: (...args: unknown[]) => editResearchCandidate(...args),
  rejectResearchCandidate: (...args: unknown[]) => rejectResearchCandidate(...args),
  saveProjectOnboardingSection: (...args: unknown[]) =>
    saveProjectOnboardingSection(...args),
  listProjectAssets: (...args: unknown[]) => listProjectAssets(...args),
  createProjectAssetUploadIntent: (...args: unknown[]) =>
    createProjectAssetUploadIntent(...args),
  completeProjectAssetUpload: (...args: unknown[]) =>
    completeProjectAssetUpload(...args),
  createProjectAssetReadIntent: (...args: unknown[]) =>
    createProjectAssetReadIntent(...args),
  removeProjectAsset: (...args: unknown[]) => removeProjectAsset(...args),
  updateProjectAssetRights: (...args: unknown[]) => updateProjectAssetRights(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import {
  completeProjectAssetUploadAction,
  createProjectAssetReadIntentAction,
  createProjectAssetUploadIntentAction,
  loadProjectOnboardingPageData,
  reconcileResearchCandidateAction,
  removeProjectAssetAction,
  saveOnboardingSectionAction,
  updateProjectAssetRightsAction,
} from "./actions";
import { mapFactoryCategoryToUserMessage } from "@/lib/factory/contract";

const projectId = "00000000-0000-4000-8000-000000000013";

const emptyOnboarding = {
  ok: true,
  projectId,
  sections: [
    "BUSINESS",
    "BRAND",
    "CONTENT",
    "GOALS",
    "REVIEW",
  ].map((sectionKey) => ({
    sectionKey,
    status: "NOT_STARTED" as const,
    version: 0,
    completedAt: null,
    updatedAt: null,
  })),
  answers: [],
};

const resume = {
  ok: true,
  project: {
    projectId,
    projectName: "Website Project",
    customerId: "00000000-0000-4000-8000-000000000010",
    customerName: "Taco Shop",
    businessId: "00000000-0000-4000-8000-000000000011",
    websiteId: "00000000-0000-4000-8000-000000000012",
    lifecycleState: "ONBOARDING" as const,
    requiredAction: "CUSTOMER",
    commercialState: "NOT_REQUIRED",
    provisioningState: "NOT_REQUIRED",
    operationalHealth: "UNKNOWN",
    createdAt: "2026-04-01T00:00:00.000Z",
  },
  intake: {
    intakeRecordId: "00000000-0000-4000-8000-000000000014",
    hasExistingWebsite: false,
    existingWebsiteUrl: null,
    businessDescription: "Taco Shop",
    thirdAnswerKey: "outcome",
    thirdAnswer: "want to sell more tacos",
  },
};

describe("onboarding actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVerifiedAccessToken.mockResolvedValue("token");
    getProjectResearch.mockResolvedValue({
      ok: true,
      data: { ok: true, projectId, runs: [], sources: [], candidates: [] },
    });
    listProjectAssets.mockResolvedValue({
      ok: true,
      data: { ok: true, projectId, assets: [] },
    });
  });

  it("loads resume and onboarding together", async () => {
    getProjectResumeDetail.mockResolvedValue({ ok: true, data: resume });
    getProjectOnboarding.mockResolvedValue({ ok: true, data: emptyOnboarding });

    const result = await loadProjectOnboardingPageData(projectId);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.resume.intake?.hasExistingWebsite).toBe(false);
      expect(result.onboarding.sections).toHaveLength(5);
      expect(result.research.status).toBe("ready");
      expect(result.assets.status).toBe("ready");
    }
  });

  it("keeps research load failures nonfatal for page success", async () => {
    getProjectResumeDetail.mockResolvedValue({ ok: true, data: resume });
    getProjectOnboarding.mockResolvedValue({ ok: true, data: emptyOnboarding });
    getProjectResearch.mockResolvedValue({
      ok: false,
      category: "temporary_failure",
      message: "down",
    });

    const result = await loadProjectOnboardingPageData(projectId);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.research.status).toBe("unavailable");
      if (result.research.status === "unavailable") {
        expect(result.research.category).toBe("temporary_failure");
      }
    }
  });

  it("maps already_completed to customer-safe message", () => {
    expect(mapFactoryCategoryToUserMessage("already_completed")).toBe(
      "This finding was already handled. Refresh the latest project state.",
    );
  });

  it("accept reconcile posts through gateway then reloads", async () => {
    acceptResearchCandidate.mockResolvedValue({
      ok: true,
      data: {
        ok: true,
        replayed: false,
        projectId,
        candidateId: "00000000-0000-4000-8000-0000000000aa",
        disposition: "ACCEPTED",
        fieldKey: "business.name",
        sectionKey: "BUSINESS",
        sectionVersion: 2,
        answerVersion: 1,
        completedAt: null,
      },
    });
    getProjectOnboarding.mockResolvedValue({ ok: true, data: emptyOnboarding });

    const result = await reconcileResearchCandidateAction({
      projectId,
      candidateId: "00000000-0000-4000-8000-0000000000aa",
      action: "accept",
      operationId: "op",
      correlationId: "00000000-0000-4000-8000-000000000099",
      expectedSectionVersion: 1,
    });
    expect(result.ok).toBe(true);
    expect(acceptResearchCandidate).toHaveBeenCalledOnce();
  });

  it("maps session expiry to exact onboarding return path", async () => {
    getProjectResumeDetail.mockResolvedValue({
      ok: false,
      category: "session_expired",
      message: "Expired",
    });
    getProjectOnboarding.mockResolvedValue({ ok: true, data: emptyOnboarding });

    const result = await loadProjectOnboardingPageData(projectId);
    expect(result.status).toBe("reauth");
    if (result.status === "reauth") {
      expect(result.signInPath).toContain(
        encodeURIComponent(`/portal/projects/${projectId}/onboarding`),
      );
    }
  });

  it("blocks business.name removal and empty replacement", async () => {
    const removed = await saveOnboardingSectionAction({
      projectId,
      sectionKey: "BUSINESS",
      operationId: "op-1",
      correlationId: "00000000-0000-4000-8000-000000000099",
      expectedVersion: 1,
      status: "IN_PROGRESS",
      answers: {},
      removeFieldKeys: ["business.name"],
    });
    expect(removed.ok).toBe(false);
    if (!removed.ok) {
      expect(removed.category).toBe("invalid_input");
    }

    const cleared = await saveOnboardingSectionAction({
      projectId,
      sectionKey: "BUSINESS",
      operationId: "op-2",
      correlationId: "00000000-0000-4000-8000-000000000098",
      expectedVersion: 1,
      status: "IN_PROGRESS",
      answers: { "business.name": "   " },
      removeFieldKeys: [],
    });
    expect(cleared.ok).toBe(false);
  });

  it("forwards valid section saves to gateway", async () => {
    saveProjectOnboardingSection.mockResolvedValue({
      ok: true,
      data: {
        ok: true,
        replayed: false,
        projectId,
        sectionKey: "BUSINESS",
        status: "IN_PROGRESS",
        version: 1,
        completedAt: null,
        updatedAnswerFieldKeys: ["business.name"],
        removedFieldKeys: [],
      },
    });

    const result = await saveOnboardingSectionAction({
      projectId,
      sectionKey: "BUSINESS",
      operationId: "op-3",
      correlationId: "00000000-0000-4000-8000-000000000097",
      expectedVersion: 0,
      status: "IN_PROGRESS",
      answers: { "business.name": "Taco Shop" },
      removeFieldKeys: [],
    });

    expect(result.ok).toBe(true);
    expect(saveProjectOnboardingSection).toHaveBeenCalledOnce();
  });

  it("rejects invalid runtime reconcile action without gateway mutation", async () => {
    const result = await reconcileResearchCandidateAction({
      projectId,
      candidateId: "00000000-0000-4000-8000-0000000000aa",
      action: "tampered-reject" as never,
      operationId: "op-bad",
      correlationId: "00000000-0000-4000-8000-000000000099",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.category).toBe("invalid_input");
    }
    expect(acceptResearchCandidate).not.toHaveBeenCalled();
    expect(editResearchCandidate).not.toHaveBeenCalled();
    expect(rejectResearchCandidate).not.toHaveBeenCalled();
  });


  it("keeps asset list failures nonfatal for page success", async () => {
    getProjectResumeDetail.mockResolvedValue({ ok: true, data: resume });
    getProjectOnboarding.mockResolvedValue({ ok: true, data: emptyOnboarding });
    listProjectAssets.mockResolvedValue({
      ok: false,
      category: "temporary_failure",
      message: "down",
    });

    const result = await loadProjectOnboardingPageData(projectId);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.assets.status).toBe("unavailable");
      if (result.assets.status === "unavailable") {
        expect(result.assets.category).toBe("temporary_failure");
      }
    }
  });

  const sampleAsset = {
    id: "00000000-0000-4000-8000-0000000000a1",
    origin: "CUSTOMER_UPLOAD" as const,
    assetKind: "IMAGE" as const,
    lifecycleState: "AVAILABLE" as const,
    validationState: "VALID" as const,
    rightsState: "CUSTOMER_PROJECT_USE_AUTHORIZED" as const,
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

  it("upload-intent action forwards metadata only", async () => {
    createProjectAssetUploadIntent.mockResolvedValue({
      ok: true,
      data: {
        ok: true,
        replayed: false,
        projectId,
        asset: { ...sampleAsset, lifecycleState: "PENDING_UPLOAD", validationState: "UNVALIDATED", availableAt: null },
        upload: {
          provider: "SUPABASE",
          bucket: "fp-project-assets",
          path: "p/a",
          token: "tok",
          expiresAt: null,
        },
      },
    });
    const result = await createProjectAssetUploadIntentAction({
      projectId,
      operationId: "00000000-0000-4000-8000-0000000000b1",
      correlationId: "00000000-0000-4000-8000-0000000000b2",
      originalFilename: "logo.png",
      contentType: "image/png",
      byteSize: 1024,
    });
    expect(result.ok).toBe(true);
    expect(createProjectAssetUploadIntent).toHaveBeenCalledWith(
      projectId,
      {
        operationId: "00000000-0000-4000-8000-0000000000b1",
        correlationId: "00000000-0000-4000-8000-0000000000b2",
        originalFilename: "logo.png",
        contentType: "image/png",
        byteSize: 1024,
      },
      expect.anything(),
    );
    const uploadCall = createProjectAssetUploadIntent.mock.calls[0];
    expect(uploadCall).toBeDefined();
    const body = uploadCall![1];
    expect(body).not.toHaveProperty("file");
    expect(body).not.toHaveProperty("blob");
  });

  it("complete action refreshes authoritative assets", async () => {
    completeProjectAssetUpload.mockResolvedValue({
      ok: true,
      data: { ok: true, replayed: false, projectId, asset: sampleAsset },
    });
    listProjectAssets.mockResolvedValue({
      ok: true,
      data: { ok: true, projectId, assets: [sampleAsset] },
    });
    const result = await completeProjectAssetUploadAction({
      projectId,
      assetId: sampleAsset.id,
      operationId: "00000000-0000-4000-8000-0000000000c1",
      correlationId: "00000000-0000-4000-8000-0000000000c2",
      expectedVersion: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.assets).toEqual({ status: "ready", assets: [sampleAsset] });
    }
  });

  it("remove stale_or_conflicting reloads assets", async () => {
    removeProjectAsset.mockResolvedValue({
      ok: false,
      category: "stale_or_conflicting",
      message: "stale",
    });
    listProjectAssets.mockResolvedValue({
      ok: true,
      data: { ok: true, projectId, assets: [sampleAsset] },
    });
    const result = await removeProjectAssetAction({
      projectId,
      assetId: sampleAsset.id,
      operationId: "00000000-0000-4000-8000-0000000000d1",
      correlationId: "00000000-0000-4000-8000-0000000000d2",
      expectedVersion: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.category).toBe("stale_or_conflicting");
      expect(result.assets?.status).toBe("ready");
    }
  });

  it("rights and read-intent actions forward exact fields", async () => {
    updateProjectAssetRights.mockResolvedValue({
      ok: true,
      data: { ok: true, replayed: false, projectId, asset: sampleAsset },
    });
    listProjectAssets.mockResolvedValue({
      ok: true,
      data: { ok: true, projectId, assets: [sampleAsset] },
    });
    const rights = await updateProjectAssetRightsAction({
      projectId,
      assetId: sampleAsset.id,
      operationId: "00000000-0000-4000-8000-0000000000e1",
      correlationId: "00000000-0000-4000-8000-0000000000e2",
      expectedVersion: 2,
      decision: "CONFIRM_PROJECT_USE",
    });
    expect(rights.ok).toBe(true);
    expect(updateProjectAssetRights).toHaveBeenCalledWith(
      projectId,
      sampleAsset.id,
      expect.objectContaining({
        expectedVersion: 2,
        decision: "CONFIRM_PROJECT_USE",
      }),
      expect.anything(),
    );

    createProjectAssetReadIntent.mockResolvedValue({
      ok: true,
      data: {
        ok: true,
        replayed: false,
        projectId,
        assetId: sampleAsset.id,
        read: { url: "https://signed.example/x", expiresAt: "2026-01-01T00:05:00.000Z" },
      },
    });
    const read = await createProjectAssetReadIntentAction({
      projectId,
      assetId: sampleAsset.id,
      operationId: "00000000-0000-4000-8000-0000000000f1",
      correlationId: "00000000-0000-4000-8000-0000000000f2",
    });
    expect(read.ok).toBe(true);
    const readCall = createProjectAssetReadIntent.mock.calls[0];
    expect(readCall).toBeDefined();
    expect(readCall![2]).not.toHaveProperty("expiresIn");
  });

  it("asset actions return sign-in path when session missing", async () => {
    getVerifiedAccessToken.mockResolvedValue(null);
    const result = await createProjectAssetUploadIntentAction({
      projectId,
      operationId: "00000000-0000-4000-8000-0000000000b1",
      correlationId: "00000000-0000-4000-8000-0000000000b2",
      originalFilename: "logo.png",
      contentType: "image/png",
      byteSize: 1024,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.category).toBe("auth_required");
      expect(result.signInPath).toContain("/sign-in");
    }
  });

});
