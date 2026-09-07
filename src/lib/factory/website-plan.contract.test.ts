import { describe, expect, it } from "vitest";

import {
  assembleWebsitePlanRequestSchema,
  assembleWebsitePlanSuccessSchema,
  confirmWebsitePlanRequestSchema,
  confirmWebsitePlanSuccessSchema,
  getWebsitePlanSuccessSchema,
  reviseWebsitePlanRequestSchema,
  reviseWebsitePlanSuccessSchema,
  websitePlanProjectionSchema,
  websitePlanRevisionSchema,
} from "./contract";

const planFixture = {
  projectId: "00000000-0000-4000-8000-000000000013",
  planId: "00000000-0000-4000-8000-000000000020",
  planVersion: 1,
  planVersionId: "00000000-0000-4000-8000-000000000021",
  headerVersion: 1,
  confirmed: false,
  requiredAction: "CUSTOMER",
  businessUnderstanding: "A local bakery",
  websiteGoals: ["Get found online"],
  packageCategory: "ESSENTIAL" as const,
  packageRationale: "ESSENTIAL:default_marketing_envelope",
  pages: [
    {
      key: "home",
      title: "Home",
      origin: "FP_RECOMMENDED" as const,
    },
  ],
  requiredFunctionality: ["contact_form"],
  modules: [
    {
      moduleKey: "booklocal",
      inclusion: "RECOMMENDED" as const,
    },
  ],
  customRequirements: [],
  designDirection: "Warm and local",
  availableContentNotes: "Logo provided",
  missingContentNotes: "Need photos",
  assetReferences: [{ assetId: "00000000-0000-4000-8000-000000000030" }],
  customerFacingAssumptions: ["Single location"],
  customerSafeAttention: [],
  assemblyStatus: "READY" as const,
  classificationAttention: [],
};

describe("B3-P1 website plan contract schemas", () => {
  it("parses GET plan null and populated responses", () => {
    expect(
      getWebsitePlanSuccessSchema.parse({ ok: true, plan: null }),
    ).toEqual({ ok: true, plan: null });
    expect(
      getWebsitePlanSuccessSchema.parse({ ok: true, plan: planFixture }).plan
        ?.planId,
    ).toBe(planFixture.planId);
  });

  it("parses assemble, revise, and confirm success responses", () => {
    expect(
      assembleWebsitePlanSuccessSchema.parse({
        ok: true,
        replayed: false,
        plan: planFixture,
      }).replayed,
    ).toBe(false);

    expect(
      reviseWebsitePlanSuccessSchema.parse({
        ok: true,
        replayed: false,
        plan: { ...planFixture, planVersion: 2 },
        requiredAction: "CUSTOMER",
      }).requiredAction,
    ).toBe("CUSTOMER");

    expect(
      confirmWebsitePlanSuccessSchema.parse({
        ok: true,
        replayed: false,
        plan: { ...planFixture, confirmed: true },
        requiredAction: "SYSTEM",
        quote: null,
        offer: null,
      }).requiredAction,
    ).toBe("SYSTEM");
  });

  it("rejects malformed upstream projection fields", () => {
    expect(() =>
      websitePlanProjectionSchema.parse({
        ...planFixture,
        packageCategory: "PREMIUM",
      }),
    ).toThrow();

    expect(() =>
      websitePlanProjectionSchema.parse({
        ...planFixture,
        pages: [{ key: "home", title: "Home", origin: "SERVER_OWNED" }],
      }),
    ).toThrow();

    expect(() =>
      websitePlanProjectionSchema.parse({
        ...planFixture,
        modules: [{ moduleKey: "booklocal", inclusion: "FORCED" }],
      }),
    ).toThrow();

    expect(() =>
      websitePlanProjectionSchema.parse({
        ...planFixture,
        planId: "not-a-uuid",
      }),
    ).toThrow();

    expect(() =>
      websitePlanProjectionSchema.parse({
        ...planFixture,
        planVersionId: undefined,
      }),
    ).toThrow();
  });

  it("rejects forbidden revision authority fields and unknown modules", () => {
    expect(() =>
      websitePlanRevisionSchema.parse({
        addPages: [{ title: "About", origin: "CUSTOMER_ADDED" }],
      }),
    ).toThrow();

    expect(() =>
      websitePlanRevisionSchema.parse({
        moduleIntents: [{ moduleKey: "booking", intent: "SELECT" }],
      }),
    ).toThrow();

    expect(
      reviseWebsitePlanRequestSchema.parse({
        operationId: "00000000-0000-4000-8000-000000000040",
        correlationId: "00000000-0000-4000-8000-000000000041",
        expectedPlanVersion: 1,
        revision: {
          moduleIntents: [{ moduleKey: "booklocal", intent: "SELECT" }],
        },
      }).revision.moduleIntents?.[0]?.moduleKey,
    ).toBe("booklocal");
  });

  it("validates assemble and confirm request shapes", () => {
    expect(
      assembleWebsitePlanRequestSchema.parse({
        operationId: "00000000-0000-4000-8000-000000000042",
        correlationId: "00000000-0000-4000-8000-000000000043",
      }).operationId,
    ).toBe("00000000-0000-4000-8000-000000000042");

    expect(
      confirmWebsitePlanRequestSchema.parse({
        operationId: "00000000-0000-4000-8000-000000000044",
        correlationId: "00000000-0000-4000-8000-000000000045",
        expectedPlanVersion: 2,
      }).expectedPlanVersion,
    ).toBe(2);
  });
});
