import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WebsitePlanProjection } from "@/lib/factory/contract";

const assembleWebsitePlanAction = vi.fn();
const reviseWebsitePlanAction = vi.fn();
const confirmWebsitePlanAction = vi.fn();
const reloadWebsitePlanAction = vi.fn();

vi.mock("@/lib/website-plan/actions", () => ({
  assembleWebsitePlanAction: (...args: unknown[]) =>
    assembleWebsitePlanAction(...args),
  reviseWebsitePlanAction: (...args: unknown[]) =>
    reviseWebsitePlanAction(...args),
  confirmWebsitePlanAction: (...args: unknown[]) =>
    confirmWebsitePlanAction(...args),
  reloadWebsitePlanAction: (...args: unknown[]) =>
    reloadWebsitePlanAction(...args),
}));

import { WebsitePlanPanel } from "./WebsitePlanPanel";

const projectId = "00000000-0000-4000-8000-000000000013";

function basePlan(
  overrides: Partial<WebsitePlanProjection> = {},
): WebsitePlanProjection {
  return {
    projectId,
    planId: "00000000-0000-4000-8000-000000000020",
    planVersion: 1,
    planVersionId: "00000000-0000-4000-8000-000000000021",
    headerVersion: 1,
    confirmed: false,
    businessUnderstanding: "A local bakery",
    websiteGoals: ["Get found online"],
    packageCategory: "ESSENTIAL",
    packageRationale: "ESSENTIAL:default_marketing_envelope",
    pages: [
      { key: "home", title: "Home", origin: "FP_RECOMMENDED" },
      {
        key: "about",
        title: "About",
        origin: "CUSTOMER_REMOVED_FROM_RECOMMENDATION",
      },
    ],
    requiredFunctionality: ["contact_form"],
    modules: [{ moduleKey: "booklocal", inclusion: "RECOMMENDED" }],
    customRequirements: ["Evening events"],
    designDirection: "Warm and local",
    availableContentNotes: "Logo ready",
    missingContentNotes: "Need photos",
    assetReferences: [{ assetId: "00000000-0000-4000-8000-000000000030" }],
    customerFacingAssumptions: ["One location"],
    customerSafeAttention: [],
    assemblyStatus: "READY",
    classificationAttention: [],
    ...overrides,
  };
}

async function waitForEnabledButton(name: string | RegExp) {
  await waitFor(() => {
    expect(screen.getByRole("button", { name })).not.toBeDisabled();
  });
}

async function waitForMutationIdle() {
  await waitFor(() => {
    expect(
      screen.queryByRole("button", {
        name: /Preparing…|Refreshing…|Confirming…/,
      }),
    ).not.toBeInTheDocument();
    const busy = screen.queryAllByRole("button").filter((button) =>
      button.hasAttribute("aria-busy")
        ? button.getAttribute("aria-busy") === "true"
        : false,
    );
    expect(busy).toHaveLength(0);
  });
}

describe("WebsitePlanPanel", () => {
  beforeEach(() => {
    assembleWebsitePlanAction.mockReset();
    reviseWebsitePlanAction.mockReset();
    confirmWebsitePlanAction.mockReset();
    reloadWebsitePlanAction.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders no-plan state without mutating on mount", () => {
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={null}
      />,
    );
    expect(
      screen.getByText("Your Website Plan hasn’t been prepared yet."),
    ).toBeInTheDocument();
    expect(assembleWebsitePlanAction).not.toHaveBeenCalled();
  });

  it("prepares a plan once from the no-plan state", async () => {
    const plan = basePlan();
    assembleWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan,
      replayed: false,
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={null}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Prepare Website Plan" }));
    await waitFor(() => {
      expect(screen.getByText("Essential Website")).toBeInTheDocument();
    });
    expect(assembleWebsitePlanAction).toHaveBeenCalledOnce();
    expect(assembleWebsitePlanAction.mock.calls[0]?.[1]).toMatchObject({
      operationId: expect.any(String),
      correlationId: expect.any(String),
    });
  });

  it("renders package, provenance, modules, and customer-safe labels", () => {
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan({
          packageCategory: "BUSINESS",
          packageRationale: "BUSINESS:module:booklocal",
          requiredFunctionality: ["contact_form", "map"],
        })}
      />,
    );
    expect(screen.getByText("Business Website")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your plan includes scheduling needs that fit our Business Website scope.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("BUSINESS:module:booklocal")).not.toBeInTheDocument();
    expect(screen.queryByText("ESSENTIAL:default_marketing_envelope")).not.toBeInTheDocument();
    expect(screen.getByText("Contact form")).toBeInTheDocument();
    expect(screen.getByText("Location map")).toBeInTheDocument();
    expect(screen.queryByText("contact_form")).not.toBeInTheDocument();
    expect(screen.getByText("Recommended for your website")).toBeInTheDocument();
    expect(screen.getByText("Removed from recommendation")).toBeInTheDocument();
    expect(screen.getByText("BookLocal scheduling")).toBeInTheDocument();
    expect(screen.getByText("Evening events")).toBeInTheDocument();
    expect(screen.queryByText(/object_key/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/checkout/i)).not.toBeInTheDocument();
  });

  it("blocks confirm for incomplete plans and shows refresh recovery", () => {
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan({
          packageCategory: null,
          assemblyStatus: "INCOMPLETE",
          packageRationale: "INSUFFICIENT",
          customerSafeAttention: ["MISSING_CRITICAL_FIELDS"],
          classificationAttention: ["MISSING_CRITICAL_FIELDS"],
        })}
      />,
    );
    expect(
      screen.getByText("This Plan is not ready to confirm"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Website Plan needs more information"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Some required business or goals information is still missing.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("MISSING_CRITICAL_FIELDS")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Refresh Website Plan" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue onboarding" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Confirm Website Plan" }),
    ).not.toBeInTheDocument();
  });

  it("refreshes incomplete P1 via revise {} into READY P2", async () => {
    const p2 = basePlan({
      planVersion: 2,
      planVersionId: "00000000-0000-4000-8000-000000000022",
      assemblyStatus: "READY",
      packageCategory: "ESSENTIAL",
      packageRationale: "ESSENTIAL:default_marketing_envelope",
      customerSafeAttention: [],
      classificationAttention: [],
    });
    reviseWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan: p2,
      replayed: false,
      requiredAction: "CUSTOMER",
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan({
          packageCategory: null,
          assemblyStatus: "INCOMPLETE",
          packageRationale: "INSUFFICIENT",
          classificationAttention: ["MISSING_CRITICAL_FIELDS"],
        })}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh Website Plan" }),
    );
    await waitFor(() => {
      expect(screen.getByText(/Plan version 2/)).toBeInTheDocument();
    });
    expect(reviseWebsitePlanAction).toHaveBeenCalledOnce();
    expect(reviseWebsitePlanAction.mock.calls[0]?.[1]).toMatchObject({
      expectedPlanVersion: 1,
      revision: {},
    });
    expect(
      screen.getByRole("button", { name: "Confirm Website Plan" }),
    ).toBeInTheDocument();
  });

  it("keeps incomplete P2 unconfirmable after refresh", async () => {
    reviseWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan: basePlan({
        planVersion: 2,
        planVersionId: "00000000-0000-4000-8000-000000000022",
        packageCategory: null,
        assemblyStatus: "INCOMPLETE",
        packageRationale: "INSUFFICIENT",
        classificationAttention: [
          "OWNER_ATTENTION_INSUFFICIENT_CLASSIFICATION",
        ],
      }),
      replayed: false,
      requiredAction: "CUSTOMER",
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan({
          packageCategory: null,
          assemblyStatus: "INCOMPLETE",
          packageRationale: "INSUFFICIENT",
        })}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh Website Plan" }),
    );
    await waitFor(() => {
      expect(screen.getByText(/Plan version 2/)).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: "Confirm Website Plan" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Some requested capabilities need more clarity before a package can be confirmed.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("OWNER_ATTENTION_INSUFFICIENT_CLASSIFICATION"),
    ).not.toBeInTheDocument();
  });

  it("reuses refresh operation identity on temporary failure retry", async () => {
    reviseWebsitePlanAction
      .mockResolvedValueOnce({
        ok: false,
        category: "temporary_failure",
        message: "Temporary",
      })
      .mockResolvedValueOnce({
        ok: true,
        plan: basePlan({ planVersion: 2 }),
        replayed: false,
        requiredAction: "CUSTOMER",
      });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan({
          packageCategory: null,
          assemblyStatus: "INCOMPLETE",
          packageRationale: "INSUFFICIENT",
        })}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh Website Plan" }),
    );
    await waitFor(() => {
      expect(reviseWebsitePlanAction).toHaveBeenCalledOnce();
    });
    await waitForEnabledButton("Refresh Website Plan");
    const first = reviseWebsitePlanAction.mock.calls[0]?.[1] as {
      operationId: string;
      correlationId: string;
    };
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh Website Plan" }),
    );
    await waitFor(() => {
      expect(reviseWebsitePlanAction).toHaveBeenCalledTimes(2);
    });
    const second = reviseWebsitePlanAction.mock.calls[1]?.[1] as {
      operationId: string;
      correlationId: string;
    };
    expect(second.operationId).toBe(first.operationId);
    expect(second.correlationId).toBe(first.correlationId);
  });

  it("does not reuse refresh operation identity after a different intent", async () => {
    reviseWebsitePlanAction.mockResolvedValue({
      ok: false,
      category: "temporary_failure",
      message: "Temporary",
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan({
          packageCategory: null,
          assemblyStatus: "INCOMPLETE",
          packageRationale: "INSUFFICIENT",
          customRequirements: ["Keep"],
        })}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh Website Plan" }),
    );
    await waitFor(() => expect(reviseWebsitePlanAction).toHaveBeenCalledOnce());
    await waitForEnabledButton("Edit Website Plan");
    const refreshOp = reviseWebsitePlanAction.mock.calls[0]?.[1] as {
      operationId: string;
    };
    fireEvent.click(screen.getByRole("button", { name: "Edit Website Plan" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Remove requirement" }),
    );
    await waitFor(() =>
      expect(reviseWebsitePlanAction).toHaveBeenCalledTimes(2),
    );
    const nextOp = reviseWebsitePlanAction.mock.calls[1]?.[1] as {
      operationId: string;
      revision: { customRequirements: string[] };
    };
    expect(nextOp.operationId).not.toBe(refreshOp.operationId);
    expect(nextOp.revision).toEqual({ customRequirements: [] });
  });

  it("adds a page without origin and replaces P1 with returned P2", async () => {
    const p2 = basePlan({
      planVersion: 2,
      planVersionId: "00000000-0000-4000-8000-000000000022",
      pages: [
        { key: "home", title: "Home", origin: "FP_RECOMMENDED" },
        { key: "menu", title: "Menu", origin: "CUSTOMER_ADDED" },
      ],
      packageCategory: "BUSINESS",
    });
    reviseWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan: p2,
      replayed: false,
      requiredAction: "CUSTOMER",
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit Website Plan" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Menu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add page" }));
    await waitFor(() => {
      expect(screen.getByText(/Plan version 2/)).toBeInTheDocument();
    });
    expect(reviseWebsitePlanAction).toHaveBeenCalledOnce();
    const intent = reviseWebsitePlanAction.mock.calls[0]?.[1] as {
      expectedPlanVersion: number;
      revision: { addPages: Array<Record<string, unknown>> };
    };
    expect(intent.expectedPlanVersion).toBe(1);
    expect(intent.revision.addPages[0]).toEqual({ title: "Menu" });
    expect(intent.revision.addPages[0]).not.toHaveProperty("origin");
    expect(screen.getByText("Business Website")).toBeInTheDocument();
    expect(screen.getByText("Added by you")).toBeInTheDocument();
  });

  it("preserves operation identity for exact add-page retry", async () => {
    reviseWebsitePlanAction
      .mockResolvedValueOnce({
        ok: false,
        category: "temporary_failure",
        message: "Temporary",
      })
      .mockResolvedValueOnce({
        ok: true,
        plan: basePlan({ planVersion: 2 }),
        replayed: false,
        requiredAction: "CUSTOMER",
      });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit Website Plan" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Menu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add page" }));
    await waitFor(() => expect(reviseWebsitePlanAction).toHaveBeenCalledOnce());
    await waitForEnabledButton("Add page");
    const first = reviseWebsitePlanAction.mock.calls[0]?.[1] as {
      operationId: string;
      correlationId: string;
    };
    fireEvent.click(screen.getByRole("button", { name: "Add page" }));
    await waitFor(() =>
      expect(reviseWebsitePlanAction).toHaveBeenCalledTimes(2),
    );
    const second = reviseWebsitePlanAction.mock.calls[1]?.[1] as {
      operationId: string;
      correlationId: string;
    };
    expect(second.operationId).toBe(first.operationId);
    expect(second.correlationId).toBe(first.correlationId);
  });

  it("allocates new operation identity when add-page text changes", async () => {
    reviseWebsitePlanAction.mockResolvedValue({
      ok: false,
      category: "temporary_failure",
      message: "Temporary",
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit Website Plan" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Menu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add page" }));
    await waitFor(() => expect(reviseWebsitePlanAction).toHaveBeenCalledOnce());
    await waitForEnabledButton("Add page");
    const first = reviseWebsitePlanAction.mock.calls[0]?.[1] as {
      operationId: string;
      correlationId: string;
    };
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Catering" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add page" }));
    await waitFor(() =>
      expect(reviseWebsitePlanAction).toHaveBeenCalledTimes(2),
    );
    const second = reviseWebsitePlanAction.mock.calls[1]?.[1] as {
      operationId: string;
      correlationId: string;
    };
    expect(second.operationId).not.toBe(first.operationId);
    expect(second.correlationId).not.toBe(first.correlationId);
  });

  it("allocates new operation identity when switching from add-page to BookLocal", async () => {
    reviseWebsitePlanAction.mockResolvedValue({
      ok: false,
      category: "temporary_failure",
      message: "Temporary",
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit Website Plan" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Menu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add page" }));
    await waitFor(() => expect(reviseWebsitePlanAction).toHaveBeenCalledOnce());
    await waitForEnabledButton("Decline BookLocal");
    const first = reviseWebsitePlanAction.mock.calls[0]?.[1] as {
      operationId: string;
      correlationId: string;
    };
    fireEvent.click(
      screen.getByRole("button", { name: "Decline BookLocal" }),
    );
    await waitFor(() =>
      expect(reviseWebsitePlanAction).toHaveBeenCalledTimes(2),
    );
    const second = reviseWebsitePlanAction.mock.calls[1]?.[1] as {
      operationId: string;
      correlationId: string;
    };
    expect(second.operationId).not.toBe(first.operationId);
    expect(second.correlationId).not.toBe(first.correlationId);
  });

  it("preserves confirm operation identity on temporary failure retry", async () => {
    confirmWebsitePlanAction
      .mockResolvedValueOnce({
        ok: false,
        category: "temporary_failure",
        message: "Temporary",
      })
      .mockResolvedValueOnce({
        ok: true,
        plan: basePlan({ confirmed: true, requiredAction: "SYSTEM" }),
        replayed: false,
        requiredAction: "SYSTEM",
      });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm Website Plan" }),
    );
    await waitFor(() =>
      expect(confirmWebsitePlanAction).toHaveBeenCalledOnce(),
    );
    await waitForEnabledButton("Confirm Website Plan");
    const first = confirmWebsitePlanAction.mock.calls[0]?.[1] as {
      operationId: string;
      correlationId: string;
    };
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm Website Plan" }),
    );
    await waitFor(() =>
      expect(confirmWebsitePlanAction).toHaveBeenCalledTimes(2),
    );
    const second = confirmWebsitePlanAction.mock.calls[1]?.[1] as {
      operationId: string;
      correlationId: string;
    };
    expect(second.operationId).toBe(first.operationId);
    expect(second.correlationId).toBe(first.correlationId);
  });

  it("uses a new confirm identity after plan version changes", async () => {
    confirmWebsitePlanAction.mockResolvedValue({
      ok: false,
      category: "temporary_failure",
      message: "Temporary",
    });
    reviseWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan: basePlan({
        planVersion: 2,
        planVersionId: "00000000-0000-4000-8000-000000000022",
      }),
      replayed: false,
      requiredAction: "CUSTOMER",
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm Website Plan" }),
    );
    await waitFor(() =>
      expect(confirmWebsitePlanAction).toHaveBeenCalledOnce(),
    );
    await waitForEnabledButton("Edit Website Plan");
    const first = confirmWebsitePlanAction.mock.calls[0]?.[1] as {
      operationId: string;
      expectedPlanVersion: number;
    };
    fireEvent.click(screen.getByRole("button", { name: "Edit Website Plan" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Menu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add page" }));
    await waitFor(() => {
      expect(screen.getByText(/Plan version 2/)).toBeInTheDocument();
    });
    await waitForMutationIdle();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm Website Plan" }),
    );
    await waitFor(() =>
      expect(confirmWebsitePlanAction).toHaveBeenCalledTimes(2),
    );
    const second = confirmWebsitePlanAction.mock.calls[1]?.[1] as {
      operationId: string;
      expectedPlanVersion: number;
    };
    expect(second.expectedPlanVersion).toBe(2);
    expect(second.operationId).not.toBe(first.operationId);
  });

  it("selects canonical booklocal only", async () => {
    reviseWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan: basePlan({
        modules: [{ moduleKey: "booklocal", inclusion: "INCLUDED" }],
      }),
      replayed: false,
      requiredAction: "CUSTOMER",
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit Website Plan" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Select BookLocal scheduling" }),
    );
    await waitFor(() => {
      expect(reviseWebsitePlanAction).toHaveBeenCalled();
    });
    expect(reviseWebsitePlanAction.mock.calls[0]?.[1]).toMatchObject({
      revision: {
        moduleIntents: [{ moduleKey: "booklocal", intent: "SELECT" }],
      },
    });
  });

  it("confirms READY plans with exact version identity", async () => {
    confirmWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan: basePlan({ confirmed: true, requiredAction: "SYSTEM" }),
      replayed: false,
      requiredAction: "SYSTEM",
      quote: null,
      offer: null,
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm Website Plan" }),
    );
    await waitFor(() => {
      expect(
        screen.getAllByText(/preparing the next pricing and review step/i)
          .length,
      ).toBeGreaterThan(0);
    });
    expect(confirmWebsitePlanAction.mock.calls[0]?.[1]).toMatchObject({
      planVersionId: "00000000-0000-4000-8000-000000000021",
      expectedPlanVersion: 1,
    });
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it("shows proposal-ready copy when confirm returns Quote and Offer", async () => {
    confirmWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan: basePlan({ confirmed: true, requiredAction: "SYSTEM" }),
      replayed: false,
      requiredAction: "SYSTEM",
      quote: {
        projectId,
        quoteId: "00000000-0000-4000-8000-000000000080",
        quoteVersion: 1,
        quoteVersionId: "00000000-0000-4000-8000-000000000081",
        planVersionId: "00000000-0000-4000-8000-000000000021",
        currency: "USD",
        lines: [],
        oneTimeTotalMinor: 100,
        recurringMonthlyMinor: 0,
        depositMinor: 50,
        remainingMinor: 50,
        taxStatement: "",
        customerRationale: "",
      },
      offer: {
        projectId,
        offerId: "00000000-0000-4000-8000-000000000082",
        offerVersion: 1,
        offerVersionId: "00000000-0000-4000-8000-000000000083",
        planVersionId: "00000000-0000-4000-8000-000000000021",
        quoteVersionId: "00000000-0000-4000-8000-000000000081",
        status: "AWAITING_OWNER",
        customerPlanConfirmed: true,
        customerOfferReapproved: false,
        ownerApproved: false,
        ownerRejected: false,
        depositReady: false,
      },
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm Website Plan" }),
    );
    await waitFor(() => {
      expect(
        screen.getAllByText(/proposal and pricing are ready/i).length,
      ).toBeGreaterThan(0);
    });
    expect(
      screen.getByRole("link", { name: /View proposal & pricing/i }),
    ).toBeInTheDocument();
  });

  it("shows owner pending copy for Custom confirm", async () => {
    confirmWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan: basePlan({
        packageCategory: "CUSTOM",
        confirmed: true,
        requiredAction: "OWNER",
      }),
      replayed: false,
      requiredAction: "OWNER",
      quote: null,
      offer: null,
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan({ packageCategory: "CUSTOM" })}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm Website Plan" }),
    );
    await waitFor(() => {
      expect(screen.getAllByText(/custom commercial terms/i).length).toBeGreaterThan(
        0,
      );
    });
  });

  it("locks mutations after stale revision until reload", async () => {
    reviseWebsitePlanAction.mockResolvedValue({
      ok: false,
      category: "stale_or_conflicting",
      message: "Conflict",
    });
    reloadWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan: basePlan({
        planVersion: 2,
        planVersionId: "00000000-0000-4000-8000-000000000022",
      }),
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit Website Plan" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Menu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add page" }));
    await waitFor(() => {
      expect(screen.getByText(/updated elsewhere/i)).toBeInTheDocument();
    });
    await waitForEnabledButton("Reload latest Plan");
    expect(reviseWebsitePlanAction).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Add page" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Confirm Website Plan" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Add page" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm Website Plan" }),
    );
    expect(reviseWebsitePlanAction).toHaveBeenCalledOnce();
    expect(confirmWebsitePlanAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Reload latest Plan" }));
    await waitFor(() => {
      expect(reloadWebsitePlanAction).toHaveBeenCalledOnce();
      expect(
        screen.getByText("Loaded the latest Website Plan."),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText((_, node) =>
        node?.tagName === "P" &&
        (node.textContent ?? "").includes("Plan version 2"),
      ),
    ).toBeInTheDocument();
    await waitForEnabledButton("Edit Website Plan");
    fireEvent.click(screen.getByRole("button", { name: "Edit Website Plan" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Catering" },
    });
    reviseWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan: basePlan({
        planVersion: 3,
        planVersionId: "00000000-0000-4000-8000-000000000023",
      }),
      replayed: false,
      requiredAction: "CUSTOMER",
    });
    fireEvent.click(screen.getByRole("button", { name: "Add page" }));
    await waitFor(() => {
      expect(reviseWebsitePlanAction).toHaveBeenCalledTimes(2);
    });
    expect(reviseWebsitePlanAction.mock.calls[1]?.[1]).toMatchObject({
      expectedPlanVersion: 2,
      revision: { addPages: [{ title: "Catering" }] },
    });
  });

  it("locks mutations after stale confirm until reload", async () => {
    confirmWebsitePlanAction.mockResolvedValue({
      ok: false,
      category: "stale_or_conflicting",
      message: "Conflict",
    });
    reloadWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan: basePlan({
        planVersion: 2,
        planVersionId: "00000000-0000-4000-8000-000000000022",
      }),
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm Website Plan" }),
    );
    await waitFor(() => {
      expect(screen.getByText(/updated elsewhere/i)).toBeInTheDocument();
    });
    await waitForMutationIdle();
    expect(
      screen.getByRole("button", { name: "Confirm Website Plan" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm Website Plan" }),
    );
    expect(confirmWebsitePlanAction).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Reload latest Plan" }));
    await waitFor(() => {
      expect(screen.getByText(/Plan version 2/)).toBeInTheDocument();
    });
  });

  it("edits custom requirements with the full resulting array", async () => {
    reviseWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan: basePlan({
        planVersion: 2,
        customRequirements: ["Evening receptions"],
        packageCategory: "BUSINESS",
        packageRationale: "BUSINESS:locations_ge_2",
      }),
      replayed: false,
      requiredAction: "CUSTOMER",
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan({ customRequirements: ["Evening events"] })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit Website Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit requirement" }));
    fireEvent.change(screen.getByLabelText("Requirement"), {
      target: { value: "Evening receptions" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save requirement" }));
    await waitFor(() => {
      expect(reviseWebsitePlanAction).toHaveBeenCalledOnce();
    });
    expect(reviseWebsitePlanAction.mock.calls[0]?.[1]).toMatchObject({
      revision: { customRequirements: ["Evening receptions"] },
    });
    expect(screen.getByText("Business Website")).toBeInTheDocument();
    expect(screen.queryByText("BUSINESS:locations_ge_2")).not.toBeInTheDocument();
  });

  it("removes one custom requirement and sends remaining only", async () => {
    reviseWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan: basePlan({
        planVersion: 2,
        customRequirements: ["Keep me"],
      }),
      replayed: false,
      requiredAction: "CUSTOMER",
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan({
          customRequirements: ["Remove me", "Keep me"],
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit Website Plan" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Remove requirement" })[0]!,
    );
    await waitFor(() => {
      expect(reviseWebsitePlanAction).toHaveBeenCalledOnce();
    });
    expect(reviseWebsitePlanAction.mock.calls[0]?.[1]).toMatchObject({
      revision: { customRequirements: ["Keep me"] },
    });
  });

  it("removes the final custom requirement as an empty array", async () => {
    reviseWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan: basePlan({
        planVersion: 2,
        customRequirements: [],
        packageCategory: "ESSENTIAL",
      }),
      replayed: false,
      requiredAction: "CUSTOMER",
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan({
          customRequirements: ["Only one"],
          packageCategory: "CUSTOM",
          packageRationale: "CUSTOM:freetext:only",
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit Website Plan" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Remove requirement" }),
    );
    await waitFor(() => {
      expect(reviseWebsitePlanAction).toHaveBeenCalledOnce();
    });
    expect(reviseWebsitePlanAction.mock.calls[0]?.[1]).toMatchObject({
      revision: { customRequirements: [] },
    });
    expect(screen.getByText("Essential Website")).toBeInTheDocument();
  });

  it("moves confirmed P1 to unconfirmed P2 after requirement revision", async () => {
    reviseWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan: basePlan({
        planVersion: 2,
        planVersionId: "00000000-0000-4000-8000-000000000022",
        confirmed: false,
        requiredAction: "CUSTOMER",
        customRequirements: ["Updated requirement"],
      }),
      replayed: false,
      requiredAction: "CUSTOMER",
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan({ confirmed: true, requiredAction: "SYSTEM" })}
      />,
    );
    expect(screen.getByText(/Confirmed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Request changes" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit requirement" }));
    fireEvent.change(screen.getByLabelText("Requirement"), {
      target: { value: "Updated requirement" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save requirement" }));
    await waitFor(() => {
      expect(screen.getByText(/Plan version 2/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/· Confirmed/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm Website Plan" }),
    ).toBeInTheDocument();
  });

  it("moves confirmed P1 to unconfirmed P2 after page revision", async () => {
    reviseWebsitePlanAction.mockResolvedValue({
      ok: true,
      plan: basePlan({
        planVersion: 2,
        planVersionId: "00000000-0000-4000-8000-000000000022",
        confirmed: false,
        requiredAction: "CUSTOMER",
      }),
      replayed: false,
      requiredAction: "CUSTOMER",
    });
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan({ confirmed: true, requiredAction: "SYSTEM" })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Request changes" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Catering" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add page" }));
    await waitFor(() => {
      expect(screen.getByText(/Plan version 2/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/· Confirmed/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm Website Plan" }),
    ).toBeInTheDocument();
  });

  it("hides unknown module ids behind a generic label", () => {
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan({
          modules: [
            { moduleKey: "booklocal", inclusion: "RECOMMENDED" },
            { moduleKey: "future_internal_module", inclusion: "RECOMMENDED" },
          ],
        })}
      />,
    );
    expect(screen.getByText("BookLocal scheduling")).toBeInTheDocument();
    expect(screen.getByText("Website module")).toBeInTheDocument();
    expect(screen.queryByText("future_internal_module")).not.toBeInTheDocument();
  });
});
