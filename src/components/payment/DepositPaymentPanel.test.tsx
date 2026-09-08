import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DepositPaymentStatusProjection } from "@/lib/factory/contract";

const loadDepositPaymentStatusAction = vi.fn();
const initiateDepositCheckoutAction = vi.fn();
const routerPush = vi.fn();

vi.mock("@/lib/payment/actions", () => ({
  loadDepositPaymentStatusAction: (...args: unknown[]) =>
    loadDepositPaymentStatusAction(...args),
  initiateDepositCheckoutAction: (...args: unknown[]) =>
    initiateDepositCheckoutAction(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

import { DepositPaymentPanel } from "./DepositPaymentPanel";

const projectId = "00000000-0000-4000-8000-000000000013";

function payment(
  overrides: Partial<DepositPaymentStatusProjection> = {},
): DepositPaymentStatusProjection {
  return {
    ok: true,
    paymentAvailable: true,
    paymentState: "READY_TO_PAY",
    amountDueMinor: 150000,
    currency: "USD",
    taxMinor: null,
    paymentAttemptId: null,
    ...overrides,
  };
}

describe("DepositPaymentPanel", () => {
  beforeEach(() => {
    loadDepositPaymentStatusAction.mockReset();
    initiateDepositCheckoutAction.mockReset();
    routerPush.mockReset();
    loadDepositPaymentStatusAction.mockResolvedValue({
      status: "success",
      payment: payment(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("NOT_AVAILABLE has no Pay control", async () => {
    loadDepositPaymentStatusAction.mockResolvedValue({
      status: "success",
      payment: payment({
        paymentState: "NOT_AVAILABLE",
        paymentAvailable: false,
        amountDueMinor: null,
        currency: null,
      }),
    });
    render(<DepositPaymentPanel projectId={projectId} />);
    await screen.findByText(/not available/i);
    expect(
      screen.queryByRole("button", { name: /pay production deposit/i }),
    ).not.toBeInTheDocument();
  });

  it("READY_TO_PAY shows exact amount and null-tax checkout copy", async () => {
    render(<DepositPaymentPanel projectId={projectId} />);
    await screen.findByRole("button", { name: /pay production deposit/i });
    expect(screen.getByText(/\$1,500\.00/)).toBeInTheDocument();
    expect(
      screen.getByText(/Applicable tax will be calculated securely at checkout/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\$0(\.00)?\s*tax/i)).not.toBeInTheDocument();
  });

  it("renders known Factory tax amount", async () => {
    loadDepositPaymentStatusAction.mockResolvedValue({
      status: "success",
      payment: payment({ taxMinor: 1200 }),
    });
    render(<DepositPaymentPanel projectId={projectId} />);
    await screen.findByText(/Estimated tax/i);
    expect(screen.getByText(/\$12\.00/)).toBeInTheDocument();
    expect(
      screen.queryByText(/calculated securely at checkout/i),
    ).not.toBeInTheDocument();
  });

  it("PAYMENT_IN_PROGRESS shows safe continue control", async () => {
    loadDepositPaymentStatusAction.mockResolvedValue({
      status: "success",
      payment: payment({ paymentState: "PAYMENT_IN_PROGRESS" }),
    });
    render(<DepositPaymentPanel projectId={projectId} />);
    expect(
      await screen.findByRole("button", { name: /continue to secure checkout/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /pay production deposit/i }),
    ).not.toBeInTheDocument();
  });

  it("CONFIRMING does not claim PAID", async () => {
    loadDepositPaymentStatusAction.mockResolvedValue({
      status: "success",
      payment: payment({
        paymentState: "CONFIRMING",
        paymentAvailable: false,
      }),
    });
    render(<DepositPaymentPanel projectId={projectId} />);
    await screen.findByText(/We’re confirming your payment/i);
    expect(screen.queryByText(/Deposit received/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /pay|checkout/i }),
    ).not.toBeInTheDocument();
  });

  it("PAID shows deposit-received state", async () => {
    loadDepositPaymentStatusAction.mockResolvedValue({
      status: "success",
      payment: payment({
        paymentState: "PAID",
        paymentAvailable: false,
      }),
    });
    render(<DepositPaymentPanel projectId={projectId} />);
    await screen.findByText(/Deposit received/i);
    expect(screen.getByText(/moving into production/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /pay|checkout/i }),
    ).not.toBeInTheDocument();
  });

  it("FAILED_RETRYABLE allows retry when available", async () => {
    loadDepositPaymentStatusAction.mockResolvedValue({
      status: "success",
      payment: payment({ paymentState: "FAILED_RETRYABLE" }),
    });
    render(<DepositPaymentPanel projectId={projectId} />);
    await screen.findByText(/did not complete/i);
    expect(
      screen.getByRole("button", { name: /pay production deposit/i }),
    ).toBeInTheDocument();
  });

  it("ACTION_REQUIRED has no duplicate-pay button", async () => {
    loadDepositPaymentStatusAction.mockResolvedValue({
      status: "success",
      payment: payment({
        paymentState: "ACTION_REQUIRED",
        paymentAvailable: false,
      }),
    });
    render(<DepositPaymentPanel projectId={projectId} />);
    await screen.findByText(/We’re reviewing your payment/i);
    expect(
      screen.queryByRole("button", { name: /pay|checkout/i }),
    ).not.toBeInTheDocument();
  });

  it("shows permission_denied copy safely", async () => {
    initiateDepositCheckoutAction.mockResolvedValue({
      ok: false,
      category: "permission_denied",
      message:
        "You don’t have permission to start this payment. Ask an account owner or administrator.",
    });
    render(<DepositPaymentPanel projectId={projectId} />);
    await screen.findByRole("button", { name: /pay production deposit/i });
    fireEvent.click(screen.getByRole("button", { name: /pay production deposit/i }));
    await screen.findByText(/don’t have permission to start this payment/i);
    expect(screen.queryByText(/CUSTOMER_OWNER|BUSINESS_MANAGER/i)).not.toBeInTheDocument();
  });

  it("disables double submit, reuses operationId on temporary failure, redirects once", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });

    let resolveCheckout: ((value: unknown) => void) | undefined;
    initiateDepositCheckoutAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCheckout = resolve;
        }),
    );

    render(<DepositPaymentPanel projectId={projectId} />);
    const pay = await screen.findByRole("button", {
      name: /pay production deposit/i,
    });
    fireEvent.click(pay);
    fireEvent.click(pay);

    await waitFor(() => {
      expect(initiateDepositCheckoutAction).toHaveBeenCalledTimes(1);
    });
    expect(pay).toHaveAttribute("aria-busy", "true");

    const firstOp = initiateDepositCheckoutAction.mock.calls[0]![1] as string;
    const firstCorr = initiateDepositCheckoutAction.mock.calls[0]![2] as string;

    resolveCheckout!({
      ok: false,
      category: "temporary_failure",
      message: "Temporary issue. Try again.",
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /pay production deposit/i }),
      ).toBeEnabled();
    });
    expect(screen.getByText(/Temporary issue/i)).toBeInTheDocument();

    initiateDepositCheckoutAction.mockResolvedValue({
      ok: true,
      checkout: {
        ok: true,
        replayed: false,
        paymentAttemptId: "00000000-0000-4000-8000-0000000000a1",
        checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test",
        checkoutSessionId: "cs_test",
        paymentState: "PAYMENT_IN_PROGRESS",
        amountDueMinor: 150000,
        currency: "USD",
        taxMinor: null,
      },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /pay production deposit/i }),
    );

    await waitFor(() => {
      expect(initiateDepositCheckoutAction).toHaveBeenCalledTimes(2);
    });
    expect(initiateDepositCheckoutAction.mock.calls[1]![1]).toBe(firstOp);
    expect(initiateDepositCheckoutAction.mock.calls[1]![2]).toBe(firstCorr);

    await waitFor(() => {
      expect(assign).toHaveBeenCalledTimes(1);
      expect(assign).toHaveBeenCalledWith(
        "https://checkout.stripe.com/c/pay/cs_test",
      );
    });

    vi.unstubAllGlobals();
  });
});
