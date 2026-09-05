import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ProjectOnboardingState,
  ProjectResearchState,
  ResearchCandidate,
} from "@/lib/factory/contract";
import type { ResearchLoadState } from "@/lib/onboarding/actions";

const reconcileResearchCandidateAction = vi.fn();
const refreshProjectResearchAction = vi.fn();
const reloadAuthoritativeOnboardingAndResearchAction = vi.fn();
const routerPush = vi.fn();

vi.mock("@/lib/onboarding/actions", () => ({
  reconcileResearchCandidateAction: (...args: unknown[]) =>
    reconcileResearchCandidateAction(...args),
  refreshProjectResearchAction: (...args: unknown[]) =>
    refreshProjectResearchAction(...args),
  reloadAuthoritativeOnboardingAndResearchAction: (...args: unknown[]) =>
    reloadAuthoritativeOnboardingAndResearchAction(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

import {
  ResearchFindingsPanel,
  researchReconcileIntentKey,
} from "./ResearchFindingsPanel";

const projectId = "00000000-0000-4000-8000-000000000013";
const runId = "00000000-0000-4000-8000-0000000000bb";
const sourceId = "00000000-0000-4000-8000-0000000000cc";
const candidateId = "00000000-0000-4000-8000-0000000000aa";

function makeOnboarding(): ProjectOnboardingState {
  return {
    ok: true,
    projectId,
    sections: ["BUSINESS", "BRAND", "CONTENT", "GOALS", "REVIEW"].map((sectionKey) => ({
      sectionKey: sectionKey as ProjectOnboardingState["sections"][number]["sectionKey"],
      status: "NOT_STARTED",
      version: 3,
      completedAt: null,
      updatedAt: null,
    })),
    answers: [],
  };
}

function makeCandidate(
  overrides: Partial<ResearchCandidate> = {},
): ResearchCandidate {
  return {
    id: candidateId,
    researchRunId: runId,
    fieldKey: "business.name",
    extractedValue: "Taco Shop",
    derivation: "DISCOVERED",
    disposition: "PENDING",
    advisoryConfidence: 0.5,
    observedAt: "2026-04-01T00:00:00.000Z",
    sourceIds: [sourceId],
    ...overrides,
  };
}

function makeResearch(
  overrides: Partial<ProjectResearchState> & {
    status?: ProjectResearchState["runs"][number]["status"];
    candidates?: ResearchCandidate[];
  } = {},
): ResearchLoadState {
  const status = overrides.status ?? "SUCCEEDED";
  const { status: _s, candidates, ...rest } = overrides;
  return {
    status: "ready",
    data: {
      ok: true,
      projectId,
      runs: [
        {
          id: runId,
          kind: "INITIAL_WHOLE_SITE",
          status,
          normalizedUrl: "https://example.com",
          failureClassification: null,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z",
          startedAt: null,
          finishedAt: null,
        },
      ],
      sources: [
        {
          id: sourceId,
          researchRunId: runId,
          sourceUrl: "https://example.com/about",
          classification: "DISCOVERED",
          observedAt: "2026-04-01T00:00:00.000Z",
          safeMetadata: {},
        },
      ],
      candidates: candidates ?? [makeCandidate()],
      ...rest,
    },
  };
}

describe("ResearchFindingsPanel", () => {
  const flushBeforeReconcile = vi.fn(async () => true);
  const getSectionVersion = vi.fn(() => 3);
  const onAuthoritativeState = vi.fn();
  const onNotice = vi.fn();
  const onAuthoritativeSyncBusyChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    flushBeforeReconcile.mockResolvedValue(true);
    getSectionVersion.mockReturnValue(3);
    onAuthoritativeSyncBusyChange.mockClear();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  function renderPanel(
    research: ResearchLoadState,
    activeSection: "BUSINESS" | "REVIEW" = "BUSINESS",
  ) {
    return render(
      <ResearchFindingsPanel
        projectId={projectId}
        research={research}
        activeSection={activeSection}
        getSectionVersion={getSectionVersion}
        flushBeforeReconcile={flushBeforeReconcile}
        onAuthoritativeState={onAuthoritativeState}
        onNotice={onNotice}
        onAuthoritativeSyncBusyChange={onAuthoritativeSyncBusyChange}
      />,
    );
  }

  it("shows status labels for each research run status", () => {
    for (const [status, label] of [
      ["QUEUED", "Queued"],
      ["RUNNING", "In progress"],
      ["SUCCEEDED", "Complete"],
      ["PARTIAL", "Completed with gaps"],
      ["FAILED", "Unavailable"],
    ] as const) {
      cleanup();
      renderPanel(makeResearch({ status }));
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("keeps research unavailable nonfatal", () => {
    renderPanel({
      status: "unavailable",
      category: "temporary_failure",
      message: "temp",
    });
    expect(
      screen.getByText(/Research is currently unavailable/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refresh findings/i })).toBeInTheDocument();
  });

  it("renders mapped pending candidate with accept/edit/reject and source", () => {
    renderPanel(makeResearch());
    expect(screen.getByText(/Suggested value:/i)).toBeInTheDocument();
    expect(screen.getByText("Taco Shop")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://example.com/about" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("renders unmapped findings with reject only on review", () => {
    renderPanel(
      makeResearch({
        candidates: [
          makeCandidate({
            id: "00000000-0000-4000-8000-0000000000dd",
            fieldKey: null,
            extractedValue: "<script>alert(1)</script>",
          }),
        ],
      }),
      "REVIEW",
    );
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("hides mutation controls for reviewed dispositions", () => {
    for (const disposition of ["ACCEPTED", "EDITED", "REJECTED", "SUPERSEDED"] as const) {
      cleanup();
      renderPanel(
        makeResearch({
          candidates: [makeCandidate({ disposition })],
        }),
        "REVIEW",
      );
      fireEvent.click(screen.getByText(/Reviewed findings/i));
      const article = document.querySelector(`[data-disposition="${disposition}"]`);
      expect(article).toBeTruthy();
      expect(within(article as HTMLElement).queryByRole("button", { name: "Accept" })).toBeNull();
      expect(within(article as HTMLElement).queryByRole("button", { name: "Edit" })).toBeNull();
      expect(within(article as HTMLElement).queryByRole("button", { name: "Reject" })).toBeNull();
    }
  });

  it("shows conflict notice for differing pending values", () => {
    renderPanel(
      makeResearch({
        candidates: [
          makeCandidate({
            id: "00000000-0000-4000-8000-000000000001",
            extractedValue: "A",
          }),
          makeCandidate({
            id: "00000000-0000-4000-8000-000000000002",
            extractedValue: "B",
          }),
        ],
      }),
    );
    expect(
      screen.getByText(/more than one possible value for this field/i),
    ).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("does not create clickable links for unsafe source URLs", () => {
    renderPanel(
      makeResearch({
        sources: [
          {
            id: sourceId,
            researchRunId: runId,
            sourceUrl: "javascript:alert(1)",
            classification: "DISCOVERED",
            observedAt: "2026-04-01T00:00:00.000Z",
            safeMetadata: {},
          },
        ],
      }),
    );
    expect(screen.queryByRole("link", { name: /javascript/i })).not.toBeInTheDocument();
    expect(screen.getByText("javascript:alert(1)")).toBeInTheDocument();
  });

  it("accept flushes, uses latest section version, and reloads", async () => {
    const onboarding = makeOnboarding();
    reconcileResearchCandidateAction.mockResolvedValue({
      ok: true,
      reconcile: {
        ok: true,
        replayed: false,
        projectId,
        candidateId,
        disposition: "ACCEPTED",
        fieldKey: "business.name",
        sectionKey: "BUSINESS",
        sectionVersion: 4,
        answerVersion: 1,
        completedAt: null,
      },
      onboarding: {
        ...onboarding,
        answers: [
          {
            fieldKey: "business.name",
            sectionKey: "BUSINESS",
            value: "Taco Shop",
            origin: "CUSTOMER_CONFIRMED",
            version: 1,
            updatedAt: "2026-04-01T00:00:00.000Z",
          },
        ],
      },
      research: makeResearch({
        candidates: [makeCandidate({ disposition: "ACCEPTED" })],
      }),
    });

    renderPanel(makeResearch());
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(flushBeforeReconcile).toHaveBeenCalledOnce());
    await waitFor(() => expect(reconcileResearchCandidateAction).toHaveBeenCalledOnce());
    expect(getSectionVersion).toHaveBeenCalledWith("BUSINESS");
    const payload = reconcileResearchCandidateAction.mock.calls[0]![0] as {
      action: string;
      expectedSectionVersion: number;
    };
    expect(payload.action).toBe("accept");
    expect(payload.expectedSectionVersion).toBe(3);
    expect(onAuthoritativeState).toHaveBeenCalled();
  });

  it("edit initializes editor and submits edited value", async () => {
    reconcileResearchCandidateAction.mockResolvedValue({
      ok: true,
      reconcile: {
        ok: true,
        replayed: false,
        projectId,
        candidateId,
        disposition: "EDITED",
        fieldKey: "business.name",
        sectionKey: "BUSINESS",
        sectionVersion: 4,
        answerVersion: 1,
        completedAt: null,
      },
      onboarding: makeOnboarding(),
      research: makeResearch({
        candidates: [makeCandidate({ disposition: "EDITED" })],
      }),
    });

    renderPanel(makeResearch());
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const input = screen.getByDisplayValue("Taco Shop");
    fireEvent.change(input, { target: { value: "Edited Shop" } });
    fireEvent.click(screen.getByRole("button", { name: /Save edited value/i }));

    await waitFor(() => expect(reconcileResearchCandidateAction).toHaveBeenCalledOnce());
    const payload = reconcileResearchCandidateAction.mock.calls[0]![0] as {
      action: string;
      value: unknown;
    };
    expect(payload.action).toBe("edit");
    expect(payload.value).toBe("Edited Shop");
  });

  it("reject refreshes without requiring section version", async () => {
    reconcileResearchCandidateAction.mockResolvedValue({
      ok: true,
      reconcile: {
        ok: true,
        replayed: false,
        projectId,
        candidateId,
        disposition: "REJECTED",
      },
      onboarding: makeOnboarding(),
      research: makeResearch({
        candidates: [makeCandidate({ disposition: "REJECTED" })],
      }),
    });

    renderPanel(makeResearch());
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(reconcileResearchCandidateAction).toHaveBeenCalledOnce());
    const payload = reconcileResearchCandidateAction.mock.calls[0]![0] as {
      action: string;
      expectedSectionVersion?: number;
    };
    expect(payload.action).toBe("reject");
    expect(payload.expectedSectionVersion).toBeUndefined();
    expect(onAuthoritativeState).toHaveBeenCalled();
  });

  it("stale conflict reloads without automatic CAS retry", async () => {
    reconcileResearchCandidateAction.mockResolvedValue({
      ok: false,
      category: "stale_or_conflicting",
      message: "Conflict",
      onboarding: makeOnboarding(),
      research: makeResearch(),
    });

    renderPanel(makeResearch());
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(reconcileResearchCandidateAction).toHaveBeenCalledOnce());
    expect(reconcileResearchCandidateAction).toHaveBeenCalledTimes(1);
    expect(onAuthoritativeState).toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith("Conflict", "error");
  });

  it("already_completed refreshes with nonfatal notice", async () => {
    reconcileResearchCandidateAction.mockResolvedValue({
      ok: false,
      category: "already_completed",
      message: "This finding was already handled. Refresh the latest project state.",
      onboarding: makeOnboarding(),
      research: makeResearch({
        candidates: [makeCandidate({ disposition: "ACCEPTED" })],
      }),
    });

    renderPanel(makeResearch());
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(onNotice).toHaveBeenCalled());
    expect(onNotice).toHaveBeenCalledWith(
      "This finding was already handled. Refresh the latest project state.",
      "info",
    );
    expect(reconcileResearchCandidateAction).toHaveBeenCalledTimes(1);
  });

  it("reuses operation identity on temporary failure retry", async () => {
    reconcileResearchCandidateAction.mockResolvedValue({
      ok: false,
      category: "temporary_failure",
      message: "Temporary",
    });

    renderPanel(makeResearch());
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(reconcileResearchCandidateAction).toHaveBeenCalledOnce());
    const first = reconcileResearchCandidateAction.mock.calls[0]![0] as {
      operationId: string;
      correlationId: string;
    };

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(reconcileResearchCandidateAction).toHaveBeenCalledTimes(2));
    const second = reconcileResearchCandidateAction.mock.calls[1]![0] as {
      operationId: string;
      correlationId: string;
    };
    expect(second.operationId).toBe(first.operationId);
    expect(second.correlationId).toBe(first.correlationId);
  });

  it("creates new operation identity when edit value changes", async () => {
    reconcileResearchCandidateAction.mockResolvedValue({
      ok: false,
      category: "temporary_failure",
      message: "Temporary",
    });

    renderPanel(makeResearch());
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByDisplayValue("Taco Shop"), {
      target: { value: "One" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save edited value/i }));
    await waitFor(() => expect(reconcileResearchCandidateAction).toHaveBeenCalledOnce());
    const first = reconcileResearchCandidateAction.mock.calls[0]![0] as {
      operationId: string;
      value: string;
    };

    fireEvent.change(screen.getByDisplayValue("One"), {
      target: { value: "Two" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save edited value/i }));
    await waitFor(() => expect(reconcileResearchCandidateAction).toHaveBeenCalledTimes(2));
    const second = reconcileResearchCandidateAction.mock.calls[1]![0] as {
      operationId: string;
      value: string;
    };
    expect(second.value).toBe("Two");
    expect(second.operationId).not.toBe(first.operationId);
  });

  it("polls every 5 seconds while queued/running and stops when terminal", async () => {
    vi.useFakeTimers();
    refreshProjectResearchAction.mockResolvedValue({
      ok: true,
      research: makeResearch({ status: "RUNNING" }),
    });

    const { rerender } = renderPanel(makeResearch({ status: "QUEUED" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(refreshProjectResearchAction).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(refreshProjectResearchAction).toHaveBeenCalledTimes(2);

    const terminal = makeResearch({ status: "SUCCEEDED" });
    rerender(
      <ResearchFindingsPanel
        projectId={projectId}
        research={terminal}
        activeSection="BUSINESS"
        getSectionVersion={getSectionVersion}
        flushBeforeReconcile={flushBeforeReconcile}
        onAuthoritativeState={onAuthoritativeState}
        onNotice={onNotice}
        onAuthoritativeSyncBusyChange={onAuthoritativeSyncBusyChange}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(refreshProjectResearchAction).toHaveBeenCalledTimes(2);
  });

  it("pauses polling while document is hidden and refreshes on visible", async () => {
    vi.useFakeTimers();
    let visibility: DocumentVisibilityState = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });
    refreshProjectResearchAction.mockResolvedValue({
      ok: true,
      research: makeResearch({ status: "RUNNING" }),
    });

    renderPanel(makeResearch({ status: "RUNNING" }));

    visibility = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(refreshProjectResearchAction).not.toHaveBeenCalled();

    visibility = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(refreshProjectResearchAction).toHaveBeenCalled();
  });

  it("aborts reconcile when flush fails", async () => {
    flushBeforeReconcile.mockResolvedValue(false);
    renderPanel(makeResearch());
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(flushBeforeReconcile).toHaveBeenCalled());
    expect(reconcileResearchCandidateAction).not.toHaveBeenCalled();
    expect(onAuthoritativeSyncBusyChange).toHaveBeenCalledWith(true);
    await waitFor(() =>
      expect(onAuthoritativeSyncBusyChange).toHaveBeenCalledWith(false),
    );
  });

  it("locks authoritative sync before flush and unlocks after accept reload", async () => {
    let resolveFlush: (value: boolean) => void = () => undefined;
    flushBeforeReconcile.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveFlush = resolve;
        }),
    );
    reconcileResearchCandidateAction.mockResolvedValue({
      ok: true,
      reconcile: {
        ok: true,
        replayed: false,
        projectId,
        candidateId,
        disposition: "ACCEPTED",
        fieldKey: "business.name",
        sectionKey: "BUSINESS",
        sectionVersion: 4,
        answerVersion: 1,
        completedAt: null,
      },
      onboarding: makeOnboarding(),
      research: makeResearch({
        candidates: [makeCandidate({ disposition: "ACCEPTED" })],
      }),
    });

    function LockHarness() {
      const [busy, setBusy] = useState(false);
      return (
        <div>
          <input data-testid="manual-field" disabled={busy} defaultValue="draft" />
          <button type="button" data-testid="manual-nav" disabled={busy}>
            Continue
          </button>
          <ResearchFindingsPanel
            projectId={projectId}
            research={makeResearch()}
            activeSection="BUSINESS"
            getSectionVersion={getSectionVersion}
            flushBeforeReconcile={flushBeforeReconcile}
            onAuthoritativeState={onAuthoritativeState}
            onNotice={onNotice}
            onAuthoritativeSyncBusyChange={setBusy}
          />
        </div>
      );
    }

    render(<LockHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(flushBeforeReconcile).toHaveBeenCalled());
    expect(screen.getByTestId("manual-field")).toBeDisabled();
    expect(screen.getByTestId("manual-nav")).toBeDisabled();
    expect(reconcileResearchCandidateAction).not.toHaveBeenCalled();

    await act(async () => {
      resolveFlush(true);
    });
    await waitFor(() => expect(reconcileResearchCandidateAction).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByTestId("manual-field")).not.toBeDisabled());
    expect(onAuthoritativeState).toHaveBeenCalled();
  });

  it("Refresh findings flushes first and skips reload when flush fails", async () => {
    flushBeforeReconcile.mockResolvedValue(false);
    renderPanel(makeResearch());
    fireEvent.click(screen.getByRole("button", { name: /Refresh findings/i }));
    await waitFor(() => expect(flushBeforeReconcile).toHaveBeenCalledOnce());
    expect(reloadAuthoritativeOnboardingAndResearchAction).not.toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith(
      "Save your current onboarding edits before refreshing findings.",
      "error",
    );
  });

  it("Refresh findings reloads only after successful flush while locked", async () => {
    const order: string[] = [];
    let resolveFlush: (value: boolean) => void = () => undefined;
    flushBeforeReconcile.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          order.push("flush-start");
          resolveFlush = (value) => {
            order.push("flush-done");
            resolve(value);
          };
        }),
    );
    reloadAuthoritativeOnboardingAndResearchAction.mockImplementation(async () => {
      order.push("reload");
      return {
        ok: true,
        onboarding: makeOnboarding(),
        research: makeResearch(),
      };
    });

    renderPanel(makeResearch());
    fireEvent.click(screen.getByRole("button", { name: /Refresh findings/i }));
    await waitFor(() => expect(flushBeforeReconcile).toHaveBeenCalled());
    expect(reloadAuthoritativeOnboardingAndResearchAction).not.toHaveBeenCalled();
    expect(onAuthoritativeSyncBusyChange).toHaveBeenCalledWith(true);

    await act(async () => {
      resolveFlush(true);
    });
    await waitFor(() =>
      expect(reloadAuthoritativeOnboardingAndResearchAction).toHaveBeenCalledOnce(),
    );
    expect(order).toEqual(["flush-start", "flush-done", "reload"]);
    await waitFor(() =>
      expect(onAuthoritativeSyncBusyChange).toHaveBeenCalledWith(false),
    );
  });

  it("reuses identity for same accept version and creates new identity when version changes", async () => {
    reconcileResearchCandidateAction.mockResolvedValue({
      ok: false,
      category: "temporary_failure",
      message: "Temporary",
    });
    getSectionVersion.mockReturnValue(3);
    renderPanel(makeResearch());

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(reconcileResearchCandidateAction).toHaveBeenCalledOnce());
    const first = reconcileResearchCandidateAction.mock.calls[0]![0] as {
      operationId: string;
      correlationId: string;
      expectedSectionVersion: number;
    };
    expect(first.expectedSectionVersion).toBe(3);

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(reconcileResearchCandidateAction).toHaveBeenCalledTimes(2));
    const second = reconcileResearchCandidateAction.mock.calls[1]![0] as {
      operationId: string;
      correlationId: string;
    };
    expect(second.operationId).toBe(first.operationId);
    expect(second.correlationId).toBe(first.correlationId);

    getSectionVersion.mockReturnValue(4);
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(reconcileResearchCandidateAction).toHaveBeenCalledTimes(3));
    const third = reconcileResearchCandidateAction.mock.calls[2]![0] as {
      operationId: string;
      expectedSectionVersion: number;
    };
    expect(third.expectedSectionVersion).toBe(4);
    expect(third.operationId).not.toBe(first.operationId);
  });

  it("builds intent keys that include CAS version for accept/edit", () => {
    expect(researchReconcileIntentKey("accept", candidateId, { expectedSectionVersion: 3 })).toBe(
      `accept:${candidateId}:v3`,
    );
    expect(
      researchReconcileIntentKey("accept", candidateId, { expectedSectionVersion: 4 }),
    ).not.toBe(researchReconcileIntentKey("accept", candidateId, { expectedSectionVersion: 3 }));
    expect(
      researchReconcileIntentKey("edit", candidateId, {
        expectedSectionVersion: 3,
        value: "A",
      }),
    ).not.toBe(
      researchReconcileIntentKey("edit", candidateId, {
        expectedSectionVersion: 3,
        value: "B",
      }),
    );
    expect(researchReconcileIntentKey("reject", candidateId)).toBe(`reject:${candidateId}`);
  });

  it("does not reset the 5-second poll window on unrelated callback rerenders", async () => {
    vi.useFakeTimers();
    refreshProjectResearchAction.mockResolvedValue({
      ok: true,
      research: makeResearch({ status: "RUNNING" }),
    });

    const research = makeResearch({ status: "RUNNING" });
    const { rerender } = render(
      <ResearchFindingsPanel
        projectId={projectId}
        research={research}
        activeSection="BUSINESS"
        getSectionVersion={getSectionVersion}
        flushBeforeReconcile={flushBeforeReconcile}
        onAuthoritativeState={onAuthoritativeState}
        onNotice={onNotice}
        onAuthoritativeSyncBusyChange={onAuthoritativeSyncBusyChange}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(refreshProjectResearchAction).not.toHaveBeenCalled();

    // Unrelated parent callback identity changes mid-interval
    rerender(
      <ResearchFindingsPanel
        projectId={projectId}
        research={research}
        activeSection="BUSINESS"
        getSectionVersion={getSectionVersion}
        flushBeforeReconcile={flushBeforeReconcile}
        onAuthoritativeState={() => undefined}
        onNotice={() => undefined}
        onAuthoritativeSyncBusyChange={() => undefined}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(refreshProjectResearchAction).toHaveBeenCalledTimes(1);
  });
});
