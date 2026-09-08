import { describe, expect, it } from "vitest";

import {
  DEPOSIT_PAYMENT_STATES,
  depositCheckoutRequestSchema,
  depositCheckoutSuccessSchema,
  depositPaymentStatusProjectionSchema,
  validateStripeCheckoutUrl,
} from "./contract";

const attemptId = "00000000-0000-4000-8000-0000000000a1";
const operationId = "00000000-0000-4000-8000-000000000001";
const correlationId = "00000000-0000-4000-8000-000000000002";

function statusFixture(
  paymentState: (typeof DEPOSIT_PAYMENT_STATES)[number],
  overrides: Record<string, unknown> = {},
) {
  return {
    ok: true as const,
    paymentAvailable: paymentState === "READY_TO_PAY",
    paymentState,
    amountDueMinor: 150000,
    currency: "USD",
    taxMinor: null,
    paymentAttemptId: attemptId,
    ...overrides,
  };
}

describe("B4-P1 deposit payment contracts", () => {
  it("parses GET deposit-payment for every UI state including forward-compat PAID", () => {
    for (const paymentState of DEPOSIT_PAYMENT_STATES) {
      const parsed = depositPaymentStatusProjectionSchema.parse(
        statusFixture(paymentState),
      );
      expect(parsed.paymentState).toBe(paymentState);
    }
    expect(DEPOSIT_PAYMENT_STATES).toContain("PAID");
  });

  it("rejects invalid payment states and malformed results", () => {
    expect(() =>
      depositPaymentStatusProjectionSchema.parse(
        statusFixture("READY_TO_PAY", { paymentState: "DISPUTED" }),
      ),
    ).toThrow();
    expect(() =>
      depositPaymentStatusProjectionSchema.parse(
        statusFixture("READY_TO_PAY", { amountDueMinor: "150000" }),
      ),
    ).toThrow();
    expect(() =>
      depositPaymentStatusProjectionSchema.parse({
        ...statusFixture("READY_TO_PAY"),
        clientSecret: "secret",
      }),
    ).toThrow();
  });

  it("accepts POST body with only operationId and correlationId", () => {
    const parsed = depositCheckoutRequestSchema.parse({
      operationId,
      correlationId,
    });
    expect(Object.keys(parsed).sort()).toEqual([
      "correlationId",
      "operationId",
    ]);
    expect(() =>
      depositCheckoutRequestSchema.parse({
        operationId,
        correlationId,
        amountDueMinor: 1,
      }),
    ).toThrow();
    expect(() =>
      depositCheckoutRequestSchema.parse({
        operationId,
        correlationId,
        currency: "USD",
      }),
    ).toThrow();
  });

  it("parses Checkout success and fail-closes unsafe checkout URLs", () => {
    const ok = depositCheckoutSuccessSchema.parse({
      ok: true,
      replayed: false,
      paymentAttemptId: attemptId,
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_abc",
      checkoutSessionId: "cs_test_abc",
      paymentState: "PAYMENT_IN_PROGRESS",
      amountDueMinor: 150000,
      currency: "USD",
      taxMinor: null,
    });
    expect(ok.checkoutUrl).toContain("checkout.stripe.com");
    expect(
      validateStripeCheckoutUrl("https://checkout.stripe.com/c/pay/cs_test_abc"),
    ).toMatch(/^https:\/\/checkout\.stripe\.com\//);

    expect(() =>
      validateStripeCheckoutUrl("https://evil.example/pay"),
    ).toThrow();
    expect(() =>
      validateStripeCheckoutUrl("https://pay.stripe.com/c/pay/cs_test"),
    ).toThrow();
    expect(() =>
      validateStripeCheckoutUrl("http://checkout.stripe.com/c/pay/cs_test"),
    ).toThrow();
    expect(() =>
      validateStripeCheckoutUrl("javascript:alert(1)"),
    ).toThrow();
    expect(() =>
      validateStripeCheckoutUrl(
        "https://user:pass@checkout.stripe.com/c/pay/cs_test",
      ),
    ).toThrow();
  });
});
