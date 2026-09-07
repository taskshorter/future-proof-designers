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

  it("renders package, provenance, modules, and no pricing/object_key", () => {
    render(
      <WebsitePlanPanel
        projectId={projectId}
        projectName="Bakery"
        initialPlan={basePlan({ packageCategory: "BUSINESS" })}
      />,
    );
    expect(screen.getByText("Business Website")).toBeInTheDocument();
    expect(screen.getByText("Recommended for your website")).toBeInTheDocument();
    expect(screen.getByText("Removed from recommendation")).toBeInTheDocument();
    expect(screen.getByText("BookLocal scheduling")).toBeInTheDocument();
    expect(screen.getByText("Evening events")).toBeInTheDocument();
    expect(screen.queryByText(/object_key/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/checkout/i)).not.toBeInTheDocument();
  });

  it("blocks confirm for incomplete plans", () => {
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
    expect(
      screen.getByText("This Plan is not ready to confirm"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Website Plan needs more information"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Confirm Website Plan" }),
    ).not.toBeInTheDocument();
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

  it("offers reload on stale revision without blind retry", async () => {
    reviseWebsitePlanAction.mockResolvedValue({
      ok: false,
      category: "stale_or_conflicting",
      message: "Conflict",
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
      expect(
        screen.getByText(/updated elsewhere/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Reload latest Plan" }),
    ).toBeInTheDocument();
    expect(reviseWebsitePlanAction).toHaveBeenCalledOnce();
  });

  it("moves confirmed P1 to unconfirmed P2 after revision", async () => {
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
    expect(screen.getByText(/Confirmed/)).toBeInTheDocument();
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
});
