import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ProjectOnboardingState,
  ProjectResumeDetail,
} from "@/lib/factory/contract";

const saveOnboardingSectionAction = vi.fn();
const reloadProjectOnboardingAction = vi.fn();
const routerPush = vi.fn();

vi.mock("@/lib/onboarding/actions", () => ({
  saveOnboardingSectionAction: (...args: unknown[]) =>
    saveOnboardingSectionAction(...args),
  reloadProjectOnboardingAction: (...args: unknown[]) =>
    reloadProjectOnboardingAction(...args),
}));

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

import { DeeperOnboardingFlow } from "./DeeperOnboardingFlow";

const projectId = "00000000-0000-4000-8000-000000000013";

function emptySections(
  overrides: Partial<
    Record<
      "BUSINESS" | "BRAND" | "CONTENT" | "GOALS" | "REVIEW",
      { status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE"; version?: number }
    >
  > = {},
): ProjectOnboardingState["sections"] {
  return (["BUSINESS", "BRAND", "CONTENT", "GOALS", "REVIEW"] as const).map(
    (sectionKey) => ({
      sectionKey,
      status: overrides[sectionKey]?.status ?? "NOT_STARTED",
      version: overrides[sectionKey]?.version ?? 0,
      completedAt: null,
      updatedAt: null,
    }),
  );
}

function makeResume(hasExistingWebsite: boolean): ProjectResumeDetail {
  return {
    ok: true,
    project: {
      projectId,
      projectName: "Website Project",
      customerId: "00000000-0000-4000-8000-000000000010",
      customerName: "Taco Shop",
      businessId: "00000000-0000-4000-8000-000000000011",
      websiteId: "00000000-0000-4000-8000-000000000012",
      lifecycleState: "ONBOARDING",
      requiredAction: "CUSTOMER",
      commercialState: "NOT_REQUIRED",
      provisioningState: "NOT_REQUIRED",
      operationalHealth: "UNKNOWN",
      createdAt: "2026-04-01T00:00:00.000Z",
    },
    intake: {
      intakeRecordId: "00000000-0000-4000-8000-000000000014",
      hasExistingWebsite,
      existingWebsiteUrl: hasExistingWebsite ? "https://example.com" : null,
      businessDescription: "Taco Shop",
      thirdAnswerKey: "outcome",
      thirdAnswer: "want to sell more tacos",
    },
  };
}

function makeOnboarding(
  partial: Partial<ProjectOnboardingState> = {},
): ProjectOnboardingState {
  return {
    ok: true,
    projectId,
    sections: emptySections(),
    answers: [],
    ...partial,
  };
}

function successSave(overrides: Record<string, unknown> = {}) {
  return {
    ok: true as const,
    data: {
      ok: true,
      replayed: false,
      projectId,
      sectionKey: "BUSINESS",
      status: "IN_PROGRESS",
      version: 1,
      completedAt: null,
      updatedAnswerFieldKeys: ["business.name"],
      removedFieldKeys: [],
      ...overrides,
    },
  };
}

describe("DeeperOnboardingFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    saveOnboardingSectionAction.mockResolvedValue(successSave());
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("starts on Business for an untouched project and shows B1 read-only", () => {
    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding()}
        debounceMs={50}
      />,
    );

    expect(screen.getByRole("heading", { name: "Business" })).toBeInTheDocument();
    expect(screen.getByText("What you've already told us")).toBeInTheDocument();
    expect(screen.getByText("Taco Shop")).toBeInTheDocument();
    expect(screen.getByText("want to sell more tacos")).toBeInTheDocument();
    expect(screen.queryByText(/research|candidate|upload|B3/i)).not.toBeInTheDocument();
  });

  it("hydrates saved answers and opens the first incomplete section", () => {
    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(true)}
        onboarding={makeOnboarding({
          sections: emptySections({
            BUSINESS: { status: "COMPLETE", version: 2 },
            BRAND: { status: "IN_PROGRESS", version: 1 },
          }),
          answers: [
            {
              fieldKey: "business.name",
              sectionKey: "BUSINESS",
              value: "Saved Shop",
              origin: "CUSTOMER_ENTERED",
              version: 1,
              updatedAt: "2026-04-01T00:00:00.000Z",
            },
            {
              fieldKey: "brand.current_state",
              sectionKey: "BRAND",
              value: "some existing brand elements",
              origin: "CUSTOMER_ENTERED",
              version: 1,
              updatedAt: "2026-04-01T00:00:00.000Z",
            },
          ],
        })}
        debounceMs={50}
      />,
    );

    expect(screen.getByRole("heading", { name: "Brand" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Some existing brand elements" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("autosaves after debounce as IN_PROGRESS from NOT_STARTED", async () => {
    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding()}
        debounceMs={50}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Business name/i), {
      target: { value: "Taco Shop LLC" },
    });

    expect(saveOnboardingSectionAction).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60);

    await waitFor(() => {
      expect(saveOnboardingSectionAction).toHaveBeenCalledOnce();
    });

    const payload = saveOnboardingSectionAction.mock.calls[0]![0];
    expect(payload.status).toBe("IN_PROGRESS");
    expect(payload.answers["business.name"]).toBe("Taco Shop LLC");
    expect(payload.removeFieldKeys).toEqual([]);
    expect(JSON.stringify(payload.answers)).not.toContain("null");
  });

  it("does not repeat autosave for an unchanged snapshot", async () => {
    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding()}
        debounceMs={50}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Business name/i), {
      target: { value: "Once" },
    });
    await vi.advanceTimersByTimeAsync(60);
    await waitFor(() => expect(saveOnboardingSectionAction).toHaveBeenCalledOnce());

    await vi.advanceTimersByTimeAsync(200);
    expect(saveOnboardingSectionAction).toHaveBeenCalledOnce();
  });

  it("Continue marks the section COMPLETE and advances", async () => {
    saveOnboardingSectionAction.mockResolvedValue(
      successSave({ status: "COMPLETE", version: 2 }),
    );

    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding()}
        debounceMs={50}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(saveOnboardingSectionAction).toHaveBeenCalled();
    });
    expect(saveOnboardingSectionAction.mock.calls.at(-1)![0].status).toBe("COMPLETE");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Brand" })).toBeInTheDocument();
    });
  });

  it("Back and stage navigation do not complete the section", async () => {
    saveOnboardingSectionAction.mockResolvedValue(
      successSave({ status: "IN_PROGRESS", version: 1 }),
    );

    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding({
          sections: emptySections({
            BUSINESS: { status: "IN_PROGRESS", version: 1 },
          }),
          answers: [
            {
              fieldKey: "business.name",
              sectionKey: "BUSINESS",
              value: "Shop",
              origin: "CUSTOMER_ENTERED",
              version: 1,
              updatedAt: "2026-04-01T00:00:00.000Z",
            },
          ],
        })}
        debounceMs={50}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Brand/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Brand" })).toBeInTheDocument();
    });

    const statuses = saveOnboardingSectionAction.mock.calls.map(
      (call) => call[0].status,
    );
    expect(statuses.every((status) => status !== "COMPLETE")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Business" })).toBeInTheDocument();
    });
  });

  it("failed Continue does not advance", async () => {
    saveOnboardingSectionAction.mockResolvedValue({
      ok: false,
      category: "upstream_unavailable",
      message: "Temporary failure",
    });

    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding()}
        debounceMs={50}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => {
      expect(screen.getByText("Temporary failure")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Business" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry save" })).toBeInTheDocument();
  });

  it("reuses operationId on unchanged retry after temporary failure", async () => {
    saveOnboardingSectionAction
      .mockResolvedValueOnce({
        ok: false,
        category: "upstream_unavailable",
        message: "Temporary failure",
      })
      .mockResolvedValueOnce(successSave({ status: "COMPLETE", version: 1 }));

    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding()}
        debounceMs={50}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Business name/i), {
      target: { value: "Retry Shop" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Retry save" })).toBeInTheDocument();
    });

    const firstCall = saveOnboardingSectionAction.mock.calls[0]![0];
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    await waitFor(() => {
      expect(saveOnboardingSectionAction).toHaveBeenCalledTimes(2);
    });
    const secondCall = saveOnboardingSectionAction.mock.calls[1]![0];
    expect(secondCall.operationId).toBe(firstCall.operationId);
    expect(secondCall.correlationId).toBe(firstCall.correlationId);
    expect(secondCall.status).toBe(firstCall.status);
  });

  it("clears a saved removable field via removeFieldKeys", async () => {
    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding({
          sections: emptySections({
            BUSINESS: { status: "IN_PROGRESS", version: 3 },
          }),
          answers: [
            {
              fieldKey: "business.name",
              sectionKey: "BUSINESS",
              value: "Shop",
              origin: "CUSTOMER_ENTERED",
              version: 1,
              updatedAt: "2026-04-01T00:00:00.000Z",
            },
            {
              fieldKey: "business.how_business_works",
              sectionKey: "BUSINESS",
              value: "Walk-in only",
              origin: "CUSTOMER_ENTERED",
              version: 1,
              updatedAt: "2026-04-01T00:00:00.000Z",
            },
          ],
        })}
        debounceMs={50}
      />,
    );

    fireEvent.change(screen.getByLabelText(/How the business works/i), {
      target: { value: "" },
    });
    await vi.advanceTimersByTimeAsync(60);

    await waitFor(() => {
      expect(saveOnboardingSectionAction).toHaveBeenCalled();
    });
    const payload = saveOnboardingSectionAction.mock.calls.at(-1)![0];
    expect(payload.removeFieldKeys).toContain("business.how_business_works");
    expect(payload.answers).not.toHaveProperty("business.how_business_works");
  });

  it("prevents clearing business.name", async () => {
    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding({
          sections: emptySections({
            BUSINESS: { status: "IN_PROGRESS", version: 1 },
          }),
          answers: [
            {
              fieldKey: "business.name",
              sectionKey: "BUSINESS",
              value: "Shop",
              origin: "CUSTOMER_ENTERED",
              version: 1,
              updatedAt: "2026-04-01T00:00:00.000Z",
            },
          ],
        })}
        debounceMs={50}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Business name/i), {
      target: { value: "   " },
    });
    await vi.advanceTimersByTimeAsync(60);

    await waitFor(() => {
      expect(
        screen.getAllByText(/Business name cannot be cleared/i).length,
      ).toBeGreaterThan(0);
    });
    expect(saveOnboardingSectionAction).not.toHaveBeenCalled();
  });

  it("hides existing-site keep/change when B1 says no site", async () => {
    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding({
          sections: emptySections({
            BUSINESS: { status: "COMPLETE", version: 1 },
            BRAND: { status: "COMPLETE", version: 1 },
            CONTENT: { status: "COMPLETE", version: 1 },
          }),
        })}
        debounceMs={50}
      />,
    );

    expect(screen.getByRole("heading", { name: "Goals" })).toBeInTheDocument();
    expect(
      screen.queryByText(/keep or change about the existing site/i),
    ).not.toBeInTheDocument();
  });

  it("shows existing-site keep/change when B1 says there is a site", () => {
    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(true)}
        onboarding={makeOnboarding({
          sections: emptySections({
            BUSINESS: { status: "COMPLETE", version: 1 },
            BRAND: { status: "COMPLETE", version: 1 },
            CONTENT: { status: "COMPLETE", version: 1 },
          }),
        })}
        debounceMs={50}
      />,
    );

    expect(
      screen.getByText(/What to keep or change from the existing site/i),
    ).toBeInTheDocument();
  });

  it("does not auto-delete hidden previously saved adaptive answers", async () => {
    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding({
          sections: emptySections({
            BUSINESS: { status: "COMPLETE", version: 1 },
            BRAND: { status: "COMPLETE", version: 1 },
            CONTENT: { status: "COMPLETE", version: 1 },
            GOALS: { status: "IN_PROGRESS", version: 2 },
          }),
          answers: [
            {
              fieldKey: "goals.existing_site_keep_change",
              sectionKey: "GOALS",
              value: "Keep the menu photos",
              origin: "CUSTOMER_ENTERED",
              version: 1,
              updatedAt: "2026-04-01T00:00:00.000Z",
            },
          ],
        })}
        debounceMs={50}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /Show previously saved answers that are currently hidden/i,
      }),
    ).toBeInTheDocument();
    expect(saveOnboardingSectionAction).not.toHaveBeenCalled();
  });

  it("hides brand existing style when starting fresh without a saved answer", async () => {
    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding({
          sections: emptySections({
            BUSINESS: { status: "COMPLETE", version: 1 },
          }),
        })}
        debounceMs={50}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Starting fresh/i }));
    expect(
      screen.queryByText(/existing colors or style/i),
    ).not.toBeInTheDocument();
  });

  it("enters conflict state without overwriting local edits", async () => {
    saveOnboardingSectionAction.mockResolvedValue({
      ok: false,
      category: "stale_or_conflicting",
      message: "This project was updated elsewhere.",
    });

    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding()}
        debounceMs={50}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Business name/i), {
      target: { value: "Local edit" },
    });
    await vi.advanceTimersByTimeAsync(60);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("Local edit")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload saved version" })).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(200);
    expect(saveOnboardingSectionAction).toHaveBeenCalledTimes(1);
  });

  it("reload restores authoritative onboarding state", async () => {
    saveOnboardingSectionAction.mockResolvedValue({
      ok: false,
      category: "stale_or_conflicting",
      message: "Conflict",
    });
    reloadProjectOnboardingAction.mockResolvedValue({
      status: "success",
      resume: makeResume(false),
      onboarding: makeOnboarding({
        sections: emptySections({
          BUSINESS: { status: "IN_PROGRESS", version: 9 },
        }),
        answers: [
          {
            fieldKey: "business.name",
            sectionKey: "BUSINESS",
            value: "Server truth",
            origin: "CUSTOMER_ENTERED",
              version: 1,
            updatedAt: "2026-04-01T00:00:00.000Z",
          },
        ],
      }),
    });

    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding()}
        debounceMs={50}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Business name/i), {
      target: { value: "Local edit" },
    });
    await vi.advanceTimersByTimeAsync(60);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reload saved version" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Reload saved version" }));
    await waitFor(() => {
      expect(screen.getByDisplayValue("Server truth")).toBeInTheDocument();
    });
  });

  it("redirects to sign-in for the exact onboarding return path on session expiry", async () => {
    saveOnboardingSectionAction.mockResolvedValue({
      ok: false,
      category: "session_expired",
      message: "Session expired",
    });

    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding()}
        debounceMs={50}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => {
      expect(routerPush).toHaveBeenCalled();
    });
    const path = routerPush.mock.calls[0]![0] as string;
    expect(path).toContain("/sign-in");
    expect(path).toContain(
      encodeURIComponent(`/portal/projects/${projectId}/onboarding`),
    );
  });

  it("shows Review summary, catch-all, and finish without inventing B3", async () => {
    saveOnboardingSectionAction.mockResolvedValue(
      successSave({
        sectionKey: "REVIEW",
        status: "COMPLETE",
        version: 1,
        updatedAnswerFieldKeys: ["review.catch_all"],
      }),
    );

    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding({
          sections: emptySections({
            BUSINESS: { status: "COMPLETE", version: 1 },
            BRAND: { status: "COMPLETE", version: 1 },
            CONTENT: { status: "COMPLETE", version: 1 },
            GOALS: { status: "COMPLETE", version: 1 },
          }),
          answers: [
            {
              fieldKey: "business.name",
              sectionKey: "BUSINESS",
              value: "Shop",
              origin: "CUSTOMER_ENTERED",
              version: 1,
              updatedAt: "2026-04-01T00:00:00.000Z",
            },
          ],
        })}
        debounceMs={50}
      />,
    );

    expect(screen.getByRole("heading", { name: "Review" })).toBeInTheDocument();
    const review = screen.getByRole("heading", { name: "Review" }).closest("section")!;
    expect(within(review).getByText("Shop")).toBeInTheDocument();
    expect(screen.getByLabelText(/Anything else/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Anything else/i), {
      target: { value: "Please keep the taco emoji subtle" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Finish onboarding" }));

    await waitFor(() => {
      expect(saveOnboardingSectionAction).toHaveBeenCalled();
    });
    const payload = saveOnboardingSectionAction.mock.calls.at(-1)![0];
    expect(payload.sectionKey).toBe("REVIEW");
    expect(payload.answers["review.catch_all"]).toBe(
      "Please keep the taco emoji subtle",
    );
    expect(payload.status).toBe("COMPLETE");

    await waitFor(() => {
      expect(screen.getByText(/Onboarding answers saved/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Website Plan|Quote|payment|B3/i)).not.toBeInTheDocument();
  });

  it("keeps COMPLETE status when editing a completed section", async () => {
    saveOnboardingSectionAction.mockResolvedValue(
      successSave({ status: "COMPLETE", version: 4 }),
    );

    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        resume={makeResume(false)}
        onboarding={makeOnboarding({
          sections: emptySections({
            BUSINESS: { status: "COMPLETE", version: 3 },
            BRAND: { status: "IN_PROGRESS", version: 1 },
          }),
          answers: [
            {
              fieldKey: "business.name",
              sectionKey: "BUSINESS",
              value: "Old",
              origin: "CUSTOMER_ENTERED",
              version: 1,
              updatedAt: "2026-04-01T00:00:00.000Z",
            },
          ],
        })}
        debounceMs={50}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Business/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Business" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Business name/i), {
      target: { value: "New" },
    });
    await vi.advanceTimersByTimeAsync(60);
    await waitFor(() => expect(saveOnboardingSectionAction).toHaveBeenCalled());
    expect(saveOnboardingSectionAction.mock.calls[0]![0].status).toBe("COMPLETE");
  });
});
