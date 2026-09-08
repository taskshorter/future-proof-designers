import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CommercialSnapshot } from "@/lib/commercial/actions";

const reapproveCommercialOfferAction = vi.fn();
const reloadCommercialSnapshotAction = vi.fn();
const respondCommercialNeedInfoAction = vi.fn();
const routerPush = vi.fn();

vi.mock("@/lib/commercial/actions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/commercial/actions")>(
    "@/lib/commercial/actions",
  );
  return {
    ...actual,
    reapproveCommercialOfferAction: (...args: unknown[]) =>
      reapproveCommercialOfferAction(...args),
    reloadCommercialSnapshotAction: (...args: unknown[]) =>
      reloadCommercialSnapshotAction(...args),
    respondCommercialNeedInfoAction: (...args: unknown[]) =>
      respondCommercialNeedInfoAction(...args),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
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

import { CommercialProposalPanel } from "./CommercialProposalPanel";

const projectId = "00000000-0000-4000-8000-000000000013";
const planVersionId = "00000000-0000-4000-8000-000000000021";
const quoteVersionId = "00000000-0000-4000-8000-000000000081";
const offerVersionId = "00000000-0000-4000-8000-000000000083";

function makeSnapshot(
  overrides: Partial<CommercialSnapshot> = {},
): CommercialSnapshot {
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

  const offer = {
    projectId,
    offerId: "00000000-0000-4000-8000-000000000082",
    offerVersion: 1,
    offerVersionId,
    planVersionId,
    quoteVersionId,
    status: "AWAITING_OWNER" as const,
    customerPlanConfirmed: true,
    customerOfferReapproved: false,
    ownerApproved: false,
    ownerRejected: false,
    depositReady: false,
  };

  return {
    resume: {
      ok: true,
      project: {
        projectId,
        projectName: "Website Project",
        customerId: "00000000-0000-4000-8000-000000000010",
        customerName: "Taco Shop",
        businessId: "00000000-0000-4000-8000-000000000011",
        websiteId: "00000000-0000-4000-8000-000000000012",
        lifecycleState: "ONBOARDING",
        requiredAction: "OWNER",
        commercialState: "QUOTE_READY",
        provisioningState: "NOT_REQUIRED",
        operationalHealth: "UNKNOWN",
        createdAt: "2026-04-01T00:00:00.000Z",
      },
      intake: null,
    },
    plan: {
      projectId,
      planId: "00000000-0000-4000-8000-000000000020",
      planVersion: 1,
      planVersionId,
      headerVersion: 1,
      confirmed: true,
      businessUnderstanding: "Taco shop",
      websiteGoals: ["sell more"],
      packageCategory: "ESSENTIAL",
      packageRationale: "ESSENTIAL:simple",
      pages: [{ key: "home", title: "Home", origin: "FP_RECOMMENDED" }],
      requiredFunctionality: ["contact_form"],
      modules: [],
      customRequirements: [],
      designDirection: "",
      availableContentNotes: "",
      missingContentNotes: "",
      assetReferences: [],
      customerFacingAssumptions: [],
      customerSafeAttention: [],
      assemblyStatus: "READY",
      classificationAttention: [],
    },
    quote,
    quoteReason: null,
    offer,
    offerReason: null,
    needInfo: null,
    consultationRequired: false,
    decline: null,
    versionMismatch: false,
    ...overrides,
  };
}

describe("CommercialProposalPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows awaiting-owner pricing without approval button", () => {
    render(
      <CommercialProposalPanel
        projectId={projectId}
        initialSnapshot={makeSnapshot()}
      />,
    );
    expect(screen.getByText(/being reviewed/i)).toBeInTheDocument();
    expect(screen.getByText(/Website build/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\/ month/i).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /Approve revised proposal/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/pay now|checkout|stripe/i)).not.toBeInTheDocument();
  });

  it("shows preparing and custom awaiting terms states", () => {
    const { rerender } = render(
      <CommercialProposalPanel
        key="preparing"
        projectId={projectId}
        initialSnapshot={makeSnapshot({
          quote: null,
          offer: null,
          quoteReason: "NOT_YET_AVAILABLE",
          offerReason: "NOT_YET_AVAILABLE",
        })}
      />,
    );
    expect(screen.getByText(/preparing your proposal and pricing/i)).toBeInTheDocument();

    rerender(
      <CommercialProposalPanel
        key="custom"
        projectId={projectId}
        initialSnapshot={makeSnapshot({
          quote: null,
          offer: null,
          quoteReason: "CUSTOM_AWAITING_OWNER_TERMS",
          offerReason: "CUSTOM_AWAITING_OWNER_TERMS",
        })}
      />,
    );
    expect(screen.getByText(/needs custom pricing/i)).toBeInTheDocument();
  });

  it("hides obsolete pricing for plan reconfirm", () => {
    render(
      <CommercialProposalPanel
        projectId={projectId}
        initialSnapshot={makeSnapshot({
          quote: null,
          offer: null,
          quoteReason: "PLAN_RECONFIRM_REQUIRED",
          offerReason: "PLAN_RECONFIRM_REQUIRED",
        })}
      />,
    );
    expect(screen.getByText(/Website Plan changed/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Review Website Plan/i })).toBeInTheDocument();
    expect(screen.queryByText(/Website build/i)).not.toBeInTheDocument();
  });

  it("shows need-info form with exact question and consultation note", async () => {
    respondCommercialNeedInfoAction.mockResolvedValue({
      ok: true,
      replayed: false,
      snapshot: makeSnapshot({
        offer: {
          ...makeSnapshot().offer!,
          status: "AWAITING_OWNER",
        },
        needInfo: null,
      }),
    });

    render(
      <CommercialProposalPanel
        projectId={projectId}
        initialSnapshot={makeSnapshot({
          offer: {
            ...makeSnapshot().offer!,
            status: "NEED_MORE_INFORMATION",
          },
          needInfo: {
            blockerId: "00000000-0000-4000-8000-000000000090",
            version: 2,
            category: "commercial.need_more_information",
            customerVisibleQuestion: "What is your preferred launch window?",
            state: "OPEN",
          },
          consultationRequired: true,
        })}
      />,
    );

    expect(
      screen.getByText("What is your preferred launch window?"),
    ).toBeInTheDocument();
    expect(screen.getByText(/consultation may also be needed/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Your response/i), {
      target: { value: "Next spring" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send response/i }));
    await waitFor(() => expect(respondCommercialNeedInfoAction).toHaveBeenCalled());
    expect(respondCommercialNeedInfoAction.mock.calls[0]![1]).toMatchObject({
      blockerId: "00000000-0000-4000-8000-000000000090",
      expectedBlockerVersion: 2,
      responseText: "Next spring",
    });
  });

  it("shows consultation-only and decline states safely", () => {
    const { rerender } = render(
      <CommercialProposalPanel
        key="consult"
        projectId={projectId}
        initialSnapshot={makeSnapshot({
          offer: {
            ...makeSnapshot().offer!,
            status: "NEEDS_CONSULTATION",
          },
          consultationRequired: true,
        })}
      />,
    );
    expect(screen.getByText(/A consultation is needed/i)).toBeInTheDocument();
    expect(screen.queryByText(/book consultation/i)).not.toBeInTheDocument();

    rerender(
      <CommercialProposalPanel
        key="declined"
        projectId={projectId}
        initialSnapshot={makeSnapshot({
          offer: { ...makeSnapshot().offer!, status: "DECLINED" },
          decline: {
            decision: "DECLINED",
            customerSafeExplanation: "We cannot proceed with this request.",
            decidedAt: "2026-09-07T00:00:00.000Z",
          },
        })}
      />,
    );
    expect(screen.getByText(/not moving forward/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot proceed/i)).toBeInTheDocument();
    expect(screen.queryByText(/DECLINE_/)).not.toBeInTheDocument();
  });

  it("supports revised proposal approval with exact offer version", async () => {
    reapproveCommercialOfferAction.mockResolvedValue({
      ok: true,
      replayed: false,
      snapshot: makeSnapshot({
        offer: {
          ...makeSnapshot().offer!,
          status: "AWAITING_OWNER",
          offerVersion: 2,
        },
      }),
    });

    render(
      <CommercialProposalPanel
        projectId={projectId}
        initialSnapshot={makeSnapshot({
          offer: {
            ...makeSnapshot().offer!,
            status: "AWAITING_CUSTOMER_REAPPROVAL",
          },
        })}
      />,
    );

    expect(screen.getByText(/proposal was updated/i)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Approve revised proposal/i }),
    );
    await waitFor(() => expect(reapproveCommercialOfferAction).toHaveBeenCalled());
    expect(reapproveCommercialOfferAction.mock.calls[0]![1]).toMatchObject({
      offerVersionId,
      expectedOfferVersion: 1,
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /Approve revised proposal/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("locks on stale reapproval and reuses operationId on temporary failure", async () => {
    reapproveCommercialOfferAction
      .mockResolvedValueOnce({
        ok: false,
        category: "temporary_failure",
        message: "Temporary failure",
      })
      .mockResolvedValueOnce({
        ok: false,
        category: "stale_or_conflicting",
        message: "Conflict",
      });

    render(
      <CommercialProposalPanel
        projectId={projectId}
        initialSnapshot={makeSnapshot({
          offer: {
            ...makeSnapshot().offer!,
            status: "AWAITING_CUSTOMER_REAPPROVAL",
          },
        })}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Approve revised proposal/i }),
    );
    await waitFor(() => expect(reapproveCommercialOfferAction).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getByText(/Temporary failure/i)).toBeInTheDocument();
    });
    const firstOp = reapproveCommercialOfferAction.mock.calls[0]![1].operationId;
    fireEvent.click(
      screen.getByRole("button", { name: /Approve revised proposal/i }),
    );
    await waitFor(() => expect(reapproveCommercialOfferAction).toHaveBeenCalledTimes(2));
    expect(reapproveCommercialOfferAction.mock.calls[1]![1].operationId).toBe(firstOp);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Reload latest proposal/i })).toBeInTheDocument();
    });
  });

  it("shows deposit-ready without payment controls", () => {
    render(
      <CommercialProposalPanel
        projectId={projectId}
        initialSnapshot={makeSnapshot({
          offer: {
            ...makeSnapshot().offer!,
            status: "DEPOSIT_READY",
            depositReady: true,
          },
        })}
      />,
    );
    expect(screen.getByText(/ready to start/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Deposit/i).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /pay|checkout|card/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/payment is available/i)).not.toBeInTheDocument();
  });

  it("shows owner-approved finalizing state without payment", () => {
    render(
      <CommercialProposalPanel
        projectId={projectId}
        initialSnapshot={makeSnapshot({
          offer: {
            ...makeSnapshot().offer!,
            status: "OWNER_APPROVED",
            ownerApproved: true,
            depositReady: false,
          },
        })}
      />,
    );
    expect(screen.getByText(/has been approved/i)).toBeInTheDocument();
    expect(screen.queryByText(/pay now|checkout/i)).not.toBeInTheDocument();
  });

  it("shows neutral decline copy when customerSafeExplanation is null", () => {
    render(
      <CommercialProposalPanel
        projectId={projectId}
        initialSnapshot={makeSnapshot({
          offer: { ...makeSnapshot().offer!, status: "DECLINED" },
          decline: {
            decision: "DECLINED",
            customerSafeExplanation: null,
            decidedAt: "2026-09-07T00:00:00.000Z",
          },
        })}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /Proposal not moving forward/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /This proposal is not moving forward at this time\. If you have questions, contact Future Proof\./,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/DECLINE_/)).not.toBeInTheDocument();
  });

  it("hides reapproval when versionMismatch is true", () => {
    render(
      <CommercialProposalPanel
        projectId={projectId}
        initialSnapshot={makeSnapshot({
          offer: {
            ...makeSnapshot().offer!,
            status: "AWAITING_CUSTOMER_REAPPROVAL",
          },
          versionMismatch: true,
        })}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Approve revised proposal/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Reload latest proposal/i }),
    ).toBeInTheDocument();
  });

  it("reuses need-info operation identity only for the exact trimmed response payload", async () => {
    respondCommercialNeedInfoAction
      .mockResolvedValueOnce({
        ok: false,
        category: "temporary_failure",
        message: "Temporary failure",
      })
      .mockResolvedValueOnce({
        ok: false,
        category: "temporary_failure",
        message: "Temporary failure",
      })
      .mockResolvedValueOnce({
        ok: false,
        category: "temporary_failure",
        message: "Temporary failure",
      })
      .mockResolvedValueOnce({
        ok: false,
        category: "temporary_failure",
        message: "Temporary failure",
      });

    const needInfoSnapshot = makeSnapshot({
      offer: {
        ...makeSnapshot().offer!,
        status: "NEED_MORE_INFORMATION",
      },
      needInfo: {
        blockerId: "00000000-0000-4000-8000-000000000090",
        version: 2,
        category: "commercial.need_more_information",
        customerVisibleQuestion: "When can you launch?",
        state: "OPEN",
      },
    });

    render(
      <CommercialProposalPanel
        projectId={projectId}
        initialSnapshot={needInfoSnapshot}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Your response/i), {
      target: { value: "  Next March  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send response/i }));
    await waitFor(() => expect(respondCommercialNeedInfoAction).toHaveBeenCalledTimes(1));
    expect(respondCommercialNeedInfoAction.mock.calls[0]![1].responseText).toBe(
      "Next March",
    );
    const firstOp = respondCommercialNeedInfoAction.mock.calls[0]![1].operationId;
    const firstCorrelation =
      respondCommercialNeedInfoAction.mock.calls[0]![1].correlationId;

    fireEvent.change(screen.getByLabelText(/Your response/i), {
      target: { value: "Next March" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send response/i }));
    await waitFor(() => expect(respondCommercialNeedInfoAction).toHaveBeenCalledTimes(2));
    expect(respondCommercialNeedInfoAction.mock.calls[1]![1].operationId).toBe(firstOp);
    expect(respondCommercialNeedInfoAction.mock.calls[1]![1].correlationId).toBe(
      firstCorrelation,
    );
    expect(respondCommercialNeedInfoAction.mock.calls[1]![1].responseText).toBe(
      "Next March",
    );

    fireEvent.change(screen.getByLabelText(/Your response/i), {
      target: { value: "Next  March" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send response/i }));
    await waitFor(() => expect(respondCommercialNeedInfoAction).toHaveBeenCalledTimes(3));
    expect(respondCommercialNeedInfoAction.mock.calls[2]![1].responseText).toBe(
      "Next  March",
    );
    expect(respondCommercialNeedInfoAction.mock.calls[2]![1].operationId).not.toBe(
      firstOp,
    );
    expect(
      respondCommercialNeedInfoAction.mock.calls[2]![1].correlationId,
    ).not.toBe(firstCorrelation);
  });

  it("clears need-info draft when reload returns a different blocker", async () => {
    const blockerA = {
      blockerId: "00000000-0000-4000-8000-000000000090",
      version: 2,
      category: "commercial.need_more_information" as const,
      customerVisibleQuestion: "Question A?",
      state: "OPEN",
    };
    const blockerB = {
      blockerId: "00000000-0000-4000-8000-000000000091",
      version: 1,
      category: "commercial.need_more_information" as const,
      customerVisibleQuestion: "Question B?",
      state: "OPEN",
    };

    reloadCommercialSnapshotAction.mockResolvedValue({
      ok: true,
      replayed: false,
      snapshot: makeSnapshot({
        offer: {
          ...makeSnapshot().offer!,
          status: "NEED_MORE_INFORMATION",
        },
        needInfo: blockerB,
        versionMismatch: false,
      }),
    });

    render(
      <CommercialProposalPanel
        projectId={projectId}
        initialSnapshot={makeSnapshot({
          offer: {
            ...makeSnapshot().offer!,
            status: "NEED_MORE_INFORMATION",
          },
          needInfo: blockerA,
          versionMismatch: true,
        })}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Your response/i), {
      target: { value: "Answer for A" },
    });
    expect(screen.getByDisplayValue("Answer for A")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Reload latest proposal/i }));
    await waitFor(() => {
      expect(screen.getByText("Question B?")).toBeInTheDocument();
    });
    expect(screen.queryByDisplayValue("Answer for A")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Your response/i)).toHaveValue("");
    expect(
      screen.getByRole("button", { name: /Send response/i }),
    ).toBeDisabled();
  });
});
