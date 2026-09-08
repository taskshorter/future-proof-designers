import { beforeEach, describe, expect, it, vi } from "vitest";

const getVerifiedAccessToken = vi.fn();
const getProjectResumeDetail = vi.fn();
const getWebsitePlan = vi.fn();
const getProjectQuote = vi.fn();
const getCommercialOffer = vi.fn();
const reapproveCommercialOffer = vi.fn();
const respondCommercialNeedInfo = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getVerifiedAccessToken: () => getVerifiedAccessToken(),
}));

vi.mock("@/lib/factory/gateway", () => ({
  getProjectResumeDetail: (...args: unknown[]) => getProjectResumeDetail(...args),
  getWebsitePlan: (...args: unknown[]) => getWebsitePlan(...args),
  getProjectQuote: (...args: unknown[]) => getProjectQuote(...args),
  getCommercialOffer: (...args: unknown[]) => getCommercialOffer(...args),
  reapproveCommercialOffer: (...args: unknown[]) =>
    reapproveCommercialOffer(...args),
  respondCommercialNeedInfo: (...args: unknown[]) =>
    respondCommercialNeedInfo(...args),
}));

import {
  loadCommercialPageData,
  reapproveCommercialOfferAction,
  respondCommercialNeedInfoAction,
} from "./actions";

const projectId = "00000000-0000-4000-8000-000000000013";
const planVersionId = "00000000-0000-4000-8000-000000000020";
const quoteVersionId = "00000000-0000-4000-8000-000000000081";
const offerVersionId = "00000000-0000-4000-8000-000000000083";

const resume = {
  ok: true,
  project: {
    projectId,
    projectName: "Website Project",
    customerId: "00000000-0000-4000-8000-000000000010",
    customerName: "Taco Shop",
    businessId: "00000000-0000-4000-8000-000000000011",
    websiteId: "00000000-0000-4000-8000-000000000012",
    lifecycleState: "ONBOARDING",
    requiredAction: "CUSTOMER",
    commercialState: "QUOTE_READY",
    provisioningState: "NOT_REQUIRED",
    operationalHealth: "UNKNOWN",
    createdAt: "2026-04-01T00:00:00.000Z",
  },
  intake: null,
};

const plan = {
  projectId,
  planId: "00000000-0000-4000-8000-000000000021",
  planVersion: 1,
  planVersionId,
  headerVersion: 1,
  confirmed: true,
  businessUnderstanding: "Taco shop",
  websiteGoals: ["sell more"],
  packageCategory: "ESSENTIAL" as const,
  packageRationale: "ESSENTIAL:simple",
  pages: [{ key: "home", title: "Home", origin: "FP_RECOMMENDED" as const }],
  requiredFunctionality: ["contact_form"],
  modules: [],
  customRequirements: [],
  designDirection: "",
  availableContentNotes: "",
  missingContentNotes: "",
  assetReferences: [],
  customerFacingAssumptions: [],
  customerSafeAttention: [],
  assemblyStatus: "READY" as const,
  classificationAttention: [],
};

const quote = {
  projectId,
  quoteId: "00000000-0000-4000-8000-000000000080",
  quoteVersion: 1,
  quoteVersionId,
  planVersionId,
  currency: "USD",
  lines: [
    {
      kind: "ONE_TIME" as const,
      label: "Website build",
      minorUnits: 250000,
      interval: null,
    },
  ],
  oneTimeTotalMinor: 250000,
  recurringMonthlyMinor: 0,
  depositMinor: 125000,
  remainingMinor: 125000,
  taxStatement: "Taxes may apply.",
  customerRationale: "Scoped to your Website Plan.",
};

const offer = {
  projectId,
  offerId: "00000000-0000-4000-8000-000000000082",
  offerVersion: 1,
  offerVersionId,
  planVersionId,
  quoteVersionId,
  status: "AWAITING_CUSTOMER_REAPPROVAL" as const,
  customerPlanConfirmed: true,
  customerOfferReapproved: false,
  ownerApproved: false,
  ownerRejected: false,
  depositReady: false,
};

function mockHappyLoad(overrides: {
  offerStatus?:
    | "DECLINED"
    | "DEPOSIT_READY"
    | "NEED_MORE_INFORMATION"
    | "NEEDS_CONSULTATION"
    | "AWAITING_CUSTOMER_REAPPROVAL"
    | "OWNER_APPROVED"
    | "AWAITING_OWNER";
  needInfo?: unknown;
  consultationRequired?: boolean;
  decline?: unknown;
} = {}) {
  getProjectResumeDetail.mockResolvedValue({ ok: true, data: resume });
  getWebsitePlan.mockResolvedValue({ ok: true, data: { ok: true, plan } });
  getProjectQuote.mockResolvedValue({ ok: true, data: { ok: true, quote } });
  getCommercialOffer.mockResolvedValue({
    ok: true,
    data: {
      ok: true,
      offer: { ...offer, status: overrides.offerStatus ?? offer.status },
      needInfo: overrides.needInfo ?? null,
      consultationRequired: overrides.consultationRequired ?? false,
      decline: overrides.decline ?? null,
    },
  });
}

describe("commercial actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVerifiedAccessToken.mockResolvedValue("token");
  });

  it("loads commercial snapshot and maps session expiry to commercial return path", async () => {
    mockHappyLoad({ offerStatus: "AWAITING_OWNER" });
    const success = await loadCommercialPageData(projectId);
    expect(success.status).toBe("success");
    if (success.status === "success") {
      expect(success.snapshot.quote?.depositMinor).toBe(125000);
      expect(success.snapshot.versionMismatch).toBe(false);
    }

    getProjectResumeDetail.mockResolvedValue({
      ok: false,
      category: "session_expired",
      message: "Expired",
    });
    getWebsitePlan.mockResolvedValue({ ok: true, data: { ok: true, plan } });
    getProjectQuote.mockResolvedValue({ ok: true, data: { ok: true, quote } });
    getCommercialOffer.mockResolvedValue({
      ok: true,
      data: {
        ok: true,
        offer,
        needInfo: null,
        consultationRequired: false,
        decline: null,
      },
    });
    const reauth = await loadCommercialPageData(projectId);
    expect(reauth.status).toBe("reauth");
    if (reauth.status === "reauth") {
      expect(reauth.signInPath).toContain(
        encodeURIComponent(`/portal/projects/${projectId}/commercial`),
      );
    }
  });

  it("reapproves with exact offer identifiers and reloads snapshot", async () => {
    mockHappyLoad();
    reapproveCommercialOffer.mockResolvedValue({
      ok: true,
      data: {
        ok: true,
        replayed: false,
        offer: { ...offer, status: "AWAITING_OWNER", offerVersion: 2 },
        requiredAction: "OWNER",
      },
    });

    const result = await reapproveCommercialOfferAction(projectId, {
      offerVersionId,
      operationId: "00000000-0000-4000-8000-000000000100",
      correlationId: "00000000-0000-4000-8000-000000000101",
      expectedOfferVersion: 1,
    });
    expect(result.ok).toBe(true);
    expect(reapproveCommercialOffer).toHaveBeenCalledWith(
      projectId,
      offerVersionId,
      expect.objectContaining({ expectedOfferVersion: 1 }),
      expect.any(Object),
    );
  });

  it("responds to need-info with exact blocker identifiers", async () => {
    mockHappyLoad();
    respondCommercialNeedInfo.mockResolvedValue({
      ok: true,
      data: {
        ok: true,
        replayed: false,
        blocker: {
          blockerId: "00000000-0000-4000-8000-000000000090",
          version: 3,
          category: "commercial.need_more_information",
          customerVisibleQuestion: "When?",
          state: "RESOLVED",
        },
        requiredAction: "OWNER",
      },
    });

    const result = await respondCommercialNeedInfoAction(projectId, {
      blockerId: "00000000-0000-4000-8000-000000000090",
      operationId: "00000000-0000-4000-8000-000000000102",
      correlationId: "00000000-0000-4000-8000-000000000103",
      expectedBlockerVersion: 2,
      responseText: "Next month works.",
    });
    expect(result.ok).toBe(true);
    expect(respondCommercialNeedInfo).toHaveBeenCalledWith(
      projectId,
      "00000000-0000-4000-8000-000000000090",
      expect.objectContaining({
        expectedBlockerVersion: 2,
        responseText: "Next month works.",
      }),
      expect.any(Object),
    );
  });

  it("surfaces stale and temporary failures distinctly", async () => {
    reapproveCommercialOffer.mockResolvedValue({
      ok: false,
      category: "stale_or_conflicting",
      message: "Conflict",
    });
    const stale = await reapproveCommercialOfferAction(projectId, {
      offerVersionId,
      operationId: "00000000-0000-4000-8000-000000000104",
      correlationId: "00000000-0000-4000-8000-000000000105",
      expectedOfferVersion: 1,
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.category).toBe("stale_or_conflicting");

    reapproveCommercialOffer.mockResolvedValue({
      ok: false,
      category: "temporary_failure",
      message: "Retry",
    });
    const temporary = await reapproveCommercialOfferAction(projectId, {
      offerVersionId,
      operationId: "00000000-0000-4000-8000-000000000106",
      correlationId: "00000000-0000-4000-8000-000000000107",
      expectedOfferVersion: 1,
    });
    expect(temporary.ok).toBe(false);
    if (!temporary.ok) expect(temporary.category).toBe("temporary_failure");
  });
});
