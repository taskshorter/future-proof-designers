import { beforeEach, describe, expect, it, vi } from "vitest";

const getVerifiedAccessToken = vi.fn();
const getProjectResumeDetail = vi.fn();
const getWebsitePlan = vi.fn();
const assembleWebsitePlan = vi.fn();
const reviseWebsitePlan = vi.fn();
const confirmWebsitePlan = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getVerifiedAccessToken: (...args: unknown[]) => getVerifiedAccessToken(...args),
}));

vi.mock("@/lib/factory/gateway", () => ({
  getProjectResumeDetail: (...args: unknown[]) => getProjectResumeDetail(...args),
  getWebsitePlan: (...args: unknown[]) => getWebsitePlan(...args),
  assembleWebsitePlan: (...args: unknown[]) => assembleWebsitePlan(...args),
  reviseWebsitePlan: (...args: unknown[]) => reviseWebsitePlan(...args),
  confirmWebsitePlan: (...args: unknown[]) => confirmWebsitePlan(...args),
}));

import {
  assembleWebsitePlanAction,
  confirmWebsitePlanAction,
  loadWebsitePlanPageData,
  reviseWebsitePlanAction,
} from "./actions";

const projectId = "00000000-0000-4000-8000-000000000013";
const plan = {
  projectId,
  planId: "00000000-0000-4000-8000-000000000020",
  planVersion: 1,
  planVersionId: "00000000-0000-4000-8000-000000000021",
  headerVersion: 1,
  confirmed: false,
  businessUnderstanding: "Bakery",
  websiteGoals: ["Leads"],
  packageCategory: "ESSENTIAL" as const,
  packageRationale: "ESSENTIAL:default_marketing_envelope",
  pages: [{ key: "home", title: "Home", origin: "FP_RECOMMENDED" as const }],
  requiredFunctionality: [],
  modules: [],
  customRequirements: [],
  designDirection: "Warm",
  availableContentNotes: "",
  missingContentNotes: "",
  assetReferences: [],
  customerFacingAssumptions: [],
  customerSafeAttention: [],
  assemblyStatus: "READY" as const,
  classificationAttention: [],
};

const resume = {
  ok: true as const,
  project: {
    projectId,
    projectName: "Bakery",
    customerId: "00000000-0000-4000-8000-000000000010",
    customerName: "Owner",
    businessId: "00000000-0000-4000-8000-000000000011",
    websiteId: "00000000-0000-4000-8000-000000000012",
    lifecycleState: "ONBOARDING" as const,
    requiredAction: "CUSTOMER",
    commercialState: "NOT_REQUIRED",
    provisioningState: "NOT_STARTED",
    operationalHealth: "HEALTHY",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  intake: null,
};

describe("B3-P1 website plan actions", () => {
  beforeEach(() => {
    getVerifiedAccessToken.mockReset();
    getProjectResumeDetail.mockReset();
    getWebsitePlan.mockReset();
    assembleWebsitePlan.mockReset();
    reviseWebsitePlan.mockReset();
    confirmWebsitePlan.mockReset();
    getVerifiedAccessToken.mockResolvedValue("token");
  });

  it("loads plan page data on success", async () => {
    getProjectResumeDetail.mockResolvedValue({ ok: true, data: resume });
    getWebsitePlan.mockResolvedValue({ ok: true, data: { ok: true, plan } });
    const result = await loadWebsitePlanPageData(projectId);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.plan?.planId).toBe(plan.planId);
    }
  });

  it("maps session expiry to reauth", async () => {
    getProjectResumeDetail.mockResolvedValue({
      ok: false,
      category: "session_expired",
      message: "Expired",
    });
    const result = await loadWebsitePlanPageData(projectId);
    expect(result.status).toBe("reauth");
  });

  it("maps foreign project to not_found", async () => {
    getProjectResumeDetail.mockResolvedValue({
      ok: false,
      category: "not_found",
      message: "Missing",
    });
    const result = await loadWebsitePlanPageData(projectId);
    expect(result.status).toBe("not_found");
  });

  it("assembles, revises, and confirms through gateway", async () => {
    assembleWebsitePlan.mockResolvedValue({
      ok: true,
      data: { ok: true, replayed: false, plan },
    });
    const assembled = await assembleWebsitePlanAction(projectId, {
      operationId: "00000000-0000-4000-8000-000000000060",
      correlationId: "00000000-0000-4000-8000-000000000061",
    });
    expect(assembled.ok).toBe(true);

    reviseWebsitePlan.mockResolvedValue({
      ok: true,
      data: {
        ok: true,
        replayed: false,
        plan: { ...plan, planVersion: 2, confirmed: false },
        requiredAction: "CUSTOMER",
      },
    });
    const revised = await reviseWebsitePlanAction(projectId, {
      operationId: "00000000-0000-4000-8000-000000000062",
      correlationId: "00000000-0000-4000-8000-000000000063",
      expectedPlanVersion: 1,
      revision: { addPages: [{ title: "About" }] },
    });
    expect(revised.ok).toBe(true);
    if (revised.ok) expect(revised.plan.planVersion).toBe(2);

    confirmWebsitePlan.mockResolvedValue({
      ok: true,
      data: {
        ok: true,
        replayed: false,
        plan: { ...plan, confirmed: true },
        requiredAction: "SYSTEM",
      },
    });
    const confirmed = await confirmWebsitePlanAction(projectId, {
      planVersionId: plan.planVersionId,
      operationId: "00000000-0000-4000-8000-000000000064",
      correlationId: "00000000-0000-4000-8000-000000000065",
      expectedPlanVersion: 1,
    });
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) expect(confirmed.requiredAction).toBe("SYSTEM");
  });

  it("maps stale and permission failures safely", async () => {
    reviseWebsitePlan.mockResolvedValue({
      ok: false,
      category: "stale_or_conflicting",
      message: "Conflict",
    });
    const stale = await reviseWebsitePlanAction(projectId, {
      operationId: "00000000-0000-4000-8000-000000000066",
      correlationId: "00000000-0000-4000-8000-000000000067",
      expectedPlanVersion: 1,
      revision: { notes: "x" },
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.category).toBe("stale_or_conflicting");

    confirmWebsitePlan.mockResolvedValue({
      ok: false,
      category: "permission_denied",
      message: "Denied",
    });
    const denied = await confirmWebsitePlanAction(projectId, {
      planVersionId: plan.planVersionId,
      operationId: "00000000-0000-4000-8000-000000000068",
      correlationId: "00000000-0000-4000-8000-000000000069",
      expectedPlanVersion: 1,
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.category).toBe("permission_denied");
  });
});
