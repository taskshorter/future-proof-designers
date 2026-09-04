import { beforeEach, describe, expect, it, vi } from "vitest";

const getVerifiedAccessToken = vi.fn();
const getProjectResumeDetail = vi.fn();
const getProjectOnboarding = vi.fn();
const saveProjectOnboardingSection = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getVerifiedAccessToken: () => getVerifiedAccessToken(),
}));

vi.mock("@/lib/factory/gateway", () => ({
  getProjectResumeDetail: (...args: unknown[]) => getProjectResumeDetail(...args),
  getProjectOnboarding: (...args: unknown[]) => getProjectOnboarding(...args),
  saveProjectOnboardingSection: (...args: unknown[]) =>
    saveProjectOnboardingSection(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import {
  loadProjectOnboardingPageData,
  saveOnboardingSectionAction,
} from "./actions";

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
  });

  it("loads resume and onboarding together", async () => {
    getProjectResumeDetail.mockResolvedValue({ ok: true, data: resume });
    getProjectOnboarding.mockResolvedValue({ ok: true, data: emptyOnboarding });

    const result = await loadProjectOnboardingPageData(projectId);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.resume.intake?.hasExistingWebsite).toBe(false);
      expect(result.onboarding.sections).toHaveLength(5);
    }
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
});
