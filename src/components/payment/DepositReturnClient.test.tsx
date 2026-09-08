import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DepositPaymentStatusProjection } from "@/lib/factory/contract";

const loadDepositPaymentStatusAction = vi.fn();

vi.mock("@/lib/payment/actions", () => ({
  loadDepositPaymentStatusAction: (...args: unknown[]) =>
    loadDepositPaymentStatusAction(...args),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import {
  DEPOSIT_RETURN_POLL_INTERVAL_SECONDS,
  DEPOSIT_RETURN_POLL_MAX_SECONDS,
  DepositReturnClient,
} from "./DepositReturnClient";

const projectId = "00000000-0000-4000-8000-000000000013";

function payment(
  paymentState: DepositPaymentStatusProjection["paymentState"],
): DepositPaymentStatusProjection {
  return {
    ok: true,
    paymentAvailable: false,
    paymentState,
    amountDueMinor: 150000,
    currency: "USD",
    taxMinor: null,
    paymentAttemptId: "00000000-0000-4000-8000-0000000000a1",
  };
}

describe("DepositReturnClient", () => {
  beforeEach(() => {
    loadDepositPaymentStatusAction.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("exports bounded poll constants", () => {
    expect(DEPOSIT_RETURN_POLL_INTERVAL_SECONDS).toBe(2);
    expect(DEPOSIT_RETURN_POLL_MAX_SECONDS).toBe(30);
  });

  it("does not mark paid from Factory CONFIRMING — attempt query never grants authority", () => {
    render(
      <DepositReturnClient
        projectId={projectId}
        initialPayment={payment("CONFIRMING")}
      />,
    );
    expect(screen.getByText(/We’re confirming your payment/i)).toBeInTheDocument();
    expect(screen.queryByText(/Deposit received/i)).not.toBeInTheDocument();
  });

  it("polls while CONFIRMING / PAYMENT_IN_PROGRESS and stops on PAID", async () => {
    loadDepositPaymentStatusAction
      .mockResolvedValueOnce({
        status: "success",
        payment: payment("CONFIRMING"),
      })
      .mockResolvedValueOnce({
        status: "success",
        payment: payment("PAID"),
      });

    render(
      <DepositReturnClient
        projectId={projectId}
        initialPayment={payment("CONFIRMING")}
        pollIntervalMs={20}
        pollMaxMs={5_000}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Deposit received/i)).toBeInTheDocument();
    });

    const callsAfterPaid = loadDepositPaymentStatusAction.mock.calls.length;
    await new Promise((r) => setTimeout(r, 80));
    expect(loadDepositPaymentStatusAction.mock.calls.length).toBe(callsAfterPaid);
  });

  it("stops polling on ACTION_REQUIRED", async () => {
    loadDepositPaymentStatusAction.mockResolvedValue({
      status: "success",
      payment: payment("ACTION_REQUIRED"),
    });

    render(
      <DepositReturnClient
        projectId={projectId}
        initialPayment={payment("PAYMENT_IN_PROGRESS")}
        pollIntervalMs={20}
        pollMaxMs={5_000}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/We’re reviewing your payment/i)).toBeInTheDocument();
    });

    const calls = loadDepositPaymentStatusAction.mock.calls.length;
    await new Promise((r) => setTimeout(r, 80));
    expect(loadDepositPaymentStatusAction.mock.calls.length).toBe(calls);
  });

  it("times out around max duration with neutral confirming copy", async () => {
    loadDepositPaymentStatusAction.mockResolvedValue({
      status: "success",
      payment: payment("CONFIRMING"),
    });

    render(
      <DepositReturnClient
        projectId={projectId}
        initialPayment={payment("CONFIRMING")}
        pollIntervalMs={20}
        pollMaxMs={60}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/still confirming your payment/i),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/payment failed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Deposit received/i)).not.toBeInTheDocument();
  });

  it("cleans up timer on unmount", async () => {
    loadDepositPaymentStatusAction.mockResolvedValue({
      status: "success",
      payment: payment("CONFIRMING"),
    });

    const { unmount } = render(
      <DepositReturnClient
        projectId={projectId}
        initialPayment={payment("CONFIRMING")}
        pollIntervalMs={20}
        pollMaxMs={5_000}
      />,
    );
    unmount();
    await new Promise((r) => setTimeout(r, 80));
    expect(loadDepositPaymentStatusAction).not.toHaveBeenCalled();
  });
});
