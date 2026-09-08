import { describe, expect, it } from "vitest";

import {
  commercialOfferProjectionSchema,
  declineProjectionSchema,
  getCommercialOfferSuccessSchema,
  getProjectQuoteSuccessSchema,
  needInfoProjectionSchema,
  quoteProjectionSchema,
} from "./contract";

const projectId = "00000000-0000-4000-8000-000000000013";
const planVersionId = "00000000-0000-4000-8000-000000000020";
const quoteVersionId = "00000000-0000-4000-8000-000000000081";

const quoteFixture = {
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
    {
      kind: "RECURRING" as const,
      label: "Hosting",
      minorUnits: 2900,
      interval: "MONTH" as const,
    },
  ],
  oneTimeTotalMinor: 250000,
  recurringMonthlyMinor: 2900,
  depositMinor: 125000,
  remainingMinor: 125000,
  taxStatement: "Taxes may apply.",
  customerRationale: "Scoped to your Website Plan.",
};

const offerFixture = {
  projectId,
  offerId: "00000000-0000-4000-8000-000000000082",
  offerVersion: 1,
  offerVersionId: "00000000-0000-4000-8000-000000000083",
  planVersionId,
  quoteVersionId,
  status: "AWAITING_OWNER" as const,
  customerPlanConfirmed: true,
  customerOfferReapproved: false,
  ownerApproved: false,
  ownerRejected: false,
  depositReady: false,
};

describe("B3-P2 commercial customer contracts", () => {
  it("parses QuoteProjection customer-safe fields and null reasons", () => {
    expect(quoteProjectionSchema.parse(quoteFixture).depositMinor).toBe(125000);
    expect(
      getProjectQuoteSuccessSchema.parse({ ok: true, quote: quoteFixture }).quote
        ?.currency,
    ).toBe("USD");
    expect(
      getProjectQuoteSuccessSchema.parse({
        ok: true,
        quote: null,
        reason: "NOT_YET_AVAILABLE",
      }),
    ).toMatchObject({ quote: null, reason: "NOT_YET_AVAILABLE" });
    expect(() =>
      quoteProjectionSchema.parse({
        ...quoteFixture,
        pricingConfigurationId: "secret",
      }),
    ).toThrow();
  });

  it("parses CommercialOffer statuses and additive envelope", () => {
    for (const status of [
      "DECLINED",
      "DEPOSIT_READY",
      "NEED_MORE_INFORMATION",
      "NEEDS_CONSULTATION",
      "AWAITING_CUSTOMER_REAPPROVAL",
      "OWNER_APPROVED",
      "AWAITING_OWNER",
    ] as const) {
      expect(
        commercialOfferProjectionSchema.parse({ ...offerFixture, status }).status,
      ).toBe(status);
    }

    const withOffer = getCommercialOfferSuccessSchema.parse({
      ok: true,
      offer: offerFixture,
      needInfo: null,
      consultationRequired: false,
      decline: null,
    });
    expect(withOffer.offer?.offerVersionId).toBe(offerFixture.offerVersionId);

    const without = getCommercialOfferSuccessSchema.parse({
      ok: true,
      offer: null,
      reason: "CUSTOM_AWAITING_OWNER_TERMS",
      needInfo: null,
      consultationRequired: true,
      decline: null,
    });
    expect(without).toMatchObject({
      offer: null,
      reason: "CUSTOM_AWAITING_OWNER_TERMS",
      consultationRequired: true,
    });
  });

  it("parses NeedInfo and Decline without classification leakage", () => {
    const needInfo = needInfoProjectionSchema.parse({
      blockerId: "00000000-0000-4000-8000-000000000090",
      version: 2,
      category: "commercial.need_more_information",
      customerVisibleQuestion: "What is your preferred launch window?",
      state: "OPEN",
    });
    expect(needInfo.customerVisibleQuestion).toContain("launch");

    const decline = declineProjectionSchema.parse({
      decision: "DECLINED",
      customerSafeExplanation: "We cannot proceed with this request.",
      decidedAt: "2026-09-07T00:00:00.000Z",
    });
    expect(decline.decision).toBe("DECLINED");
    expect(
      Object.prototype.hasOwnProperty.call(decline, "classification"),
    ).toBe(false);
    expect(() =>
      declineProjectionSchema.parse({
        ...decline,
        classification: "DECLINE_OTHER",
      }),
    ).toThrow();
  });
});
