import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DepositPaymentStatusProjection } from "@/lib/factory/contract";

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

import { DepositCancelClient } from "./DepositCancelClient";

const projectId = "00000000-0000-4000-8000-000000000013";

function payment(
  paymentState: DepositPaymentStatusProjection["paymentState"],
): DepositPaymentStatusProjection {
  return {
    ok: true,
    paymentAvailable: paymentState === "READY_TO_PAY",
    paymentState,
    amountDueMinor: 150000,
    currency: "USD",
    taxMinor: null,
    paymentAttemptId: "00000000-0000-4000-8000-0000000000a1",
  };
}

describe("DepositCancelClient", () => {
  afterEach(() => {
    cleanup();
  });

  it("READY_TO_PAY gives retry-safe copy", () => {
    render(
      <DepositCancelClient projectId={projectId} payment={payment("READY_TO_PAY")} />,
    );
    expect(screen.getByText(/Payment wasn’t completed/i)).toBeInTheDocument();
    expect(screen.queryByText(/payment cancelled/i)).not.toBeInTheDocument();
  });

  it("CONFIRMING does not claim cancellation", () => {
    render(
      <DepositCancelClient projectId={projectId} payment={payment("CONFIRMING")} />,
    );
    expect(screen.getByText(/We’re confirming your payment/i)).toBeInTheDocument();
    expect(screen.queryByText(/cancelled/i)).not.toBeInTheDocument();
  });

  it("PAID shows paid confirmation", () => {
    render(
      <DepositCancelClient projectId={projectId} payment={payment("PAID")} />,
    );
    expect(screen.getByText(/Deposit received/i)).toBeInTheDocument();
  });

  it("ACTION_REQUIRED shows review state", () => {
    render(
      <DepositCancelClient
        projectId={projectId}
        payment={payment("ACTION_REQUIRED")}
      />,
    );
    expect(screen.getByText(/We’re reviewing your payment/i)).toBeInTheDocument();
  });

  it("links back to commercial proposal", () => {
    render(
      <DepositCancelClient projectId={projectId} payment={payment("READY_TO_PAY")} />,
    );
    expect(
      screen.getByRole("link", { name: /Proposal & Pricing/i }),
    ).toHaveAttribute(
      "href",
      `/portal/projects/${projectId}/commercial`,
    );
  });
});
