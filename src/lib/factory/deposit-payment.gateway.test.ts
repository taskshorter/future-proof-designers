import { describe, expect, it, vi } from "vitest";

import { getDepositPayment, initiateDepositCheckout } from "./gateway";

const projectId = "00000000-0000-4000-8000-000000000013";
const operationId = "00000000-0000-4000-8000-000000000001";
const correlationId = "00000000-0000-4000-8000-000000000002";
const attemptId = "00000000-0000-4000-8000-0000000000a1";

function mockFetch(response: Response) {
  return vi.fn().mockResolvedValue(response);
}

const depsBase = {
  getAccessToken: async () => "access-token",
  getGatewayBaseUrl: () => "http://127.0.0.1:3001",
};

describe("B4-P1 deposit payment gateway", () => {
  it("GETs deposit-payment with bearer auth and no-store", async () => {
    const body = {
      ok: true,
      paymentAvailable: true,
      paymentState: "READY_TO_PAY",
      amountDueMinor: 150000,
      currency: "USD",
      taxMinor: null,
      paymentAttemptId: null,
    };
    const fetchImpl = mockFetch(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    const result = await getDepositPayment(projectId, {
      ...depsBase,
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `http://127.0.0.1:3001/api/v1/projects/${projectId}/deposit-payment`,
    );
    expect(init.method).toBe("GET");
    expect(init.cache).toBe("no-store");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer access-token",
    });
  });

  it("POSTs deposit-checkout with only operationId/correlationId", async () => {
    const body = {
      ok: true,
      replayed: false,
      paymentAttemptId: attemptId,
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_abc",
      checkoutSessionId: "cs_test_abc",
      paymentState: "PAYMENT_IN_PROGRESS",
      amountDueMinor: 150000,
      currency: "USD",
      taxMinor: null,
    };
    const fetchImpl = mockFetch(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    const result = await initiateDepositCheckout(
      projectId,
      { operationId, correlationId },
      { ...depsBase, fetchImpl },
    );

    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `http://127.0.0.1:3001/api/v1/projects/${projectId}/deposit-checkout`,
    );
    expect(init.method).toBe("POST");
    expect(init.cache).toBe("no-store");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer access-token",
    });
    const posted = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(posted).toEqual({ operationId, correlationId });
    expect(posted).not.toHaveProperty("amountDueMinor");
    expect(posted).not.toHaveProperty("currency");
    expect(posted).not.toHaveProperty("taxMinor");
  });

  it("fail-closes unsafe checkout URLs from Factory responses", async () => {
    const fetchImpl = mockFetch(
      new Response(
        JSON.stringify({
          ok: true,
          replayed: false,
          paymentAttemptId: attemptId,
          checkoutUrl: "https://evil.example/steal",
          checkoutSessionId: "cs_bad",
          paymentState: "PAYMENT_IN_PROGRESS",
          amountDueMinor: 150000,
          currency: "USD",
          taxMinor: null,
        }),
        { status: 200 },
      ),
    );

    const result = await initiateDepositCheckout(
      projectId,
      { operationId, correlationId },
      { ...depsBase, fetchImpl },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.category).toBe("internal_error");
    }
  });

  it("maps timeout to temporary_failure", async () => {
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

    const result = await getDepositPayment(projectId, {
      ...depsBase,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 5,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.category).toBe("temporary_failure");
    }
  });
});
