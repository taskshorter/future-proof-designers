import { describe, expect, it } from "vitest";

import {
  DECLINE_NEUTRAL_MESSAGE,
  DEPOSIT_READY_PAYMENT_NOTE,
  commercialOfferStatusHeading,
  quoteLineAmountSuffix,
} from "./labels";

describe("commercial labels", () => {
  it("maps statuses to customer headings", () => {
    expect(commercialOfferStatusHeading("AWAITING_OWNER")).toMatch(/reviewed/i);
    expect(commercialOfferStatusHeading("DEPOSIT_READY")).toMatch(/ready to start/i);
  });

  it("suffixes recurring monthly lines", () => {
    expect(
      quoteLineAmountSuffix({
        kind: "RECURRING",
        label: "Hosting",
        minorUnits: 2900,
        interval: "MONTH",
      }),
    ).toBe(" / month");
    expect(
      quoteLineAmountSuffix({
        kind: "ONE_TIME",
        label: "Build",
        minorUnits: 100,
        interval: null,
      }),
    ).toBe("");
  });

  it("keeps deposit-ready copy payment-unavailable", () => {
    expect(DEPOSIT_READY_PAYMENT_NOTE.toLowerCase()).not.toMatch(
      /\b(pay now|checkout|stripe|card)\b/,
    );
    expect(DECLINE_NEUTRAL_MESSAGE).not.toMatch(/DECLINE_/);
  });
});
