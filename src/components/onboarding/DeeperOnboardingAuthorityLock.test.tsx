import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ProjectOnboardingState,
  ProjectResumeDetail,
} from "@/lib/factory/contract";

const saveOnboardingSectionAction = vi.fn();
const reloadProjectOnboardingAction = vi.fn();
const reconcileResearchCandidateAction = vi.fn();
const refreshProjectResearchAction = vi.fn();
const reloadAuthoritativeOnboardingAndResearchAction = vi.fn();
const routerPush = vi.fn();

vi.mock("@/lib/onboarding/actions", () => ({
  saveOnboardingSectionAction: (...args: unknown[]) =>
    saveOnboardingSectionAction(...args),
  reloadProjectOnboardingAction: (...args: unknown[]) =>
    reloadProjectOnboardingAction(...args),
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
const runId = "00000000-0000-4000-8000-0000000000bb";
const sourceId = "00000000-0000-4000-8000-0000000000cc";
const candidateId = "00000000-0000-4000-8000-0000000000aa";

function emptySections(
  overrides: Partial<
    Record<
      ProjectOnboardingState["sections"][number]["sectionKey"],
      Partial<ProjectOnboardingState["sections"][number]>
    >
  > = {},
): ProjectOnboardingState["sections"] {
  return (["BUSINESS", "BRAND", "CONTENT", "GOALS", "REVIEW"] as const).map(
    (sectionKey) => ({
      sectionKey,
      status: "NOT_STARTED" as const,
      version: 0,
      completedAt: null,
      updatedAt: null,
      ...overrides[sectionKey],
    }),
  );
}

function makeOnboarding(
  overrides: Partial<ProjectOnboardingState> = {},
): ProjectOnboardingState {
  return {
    ok: true,
    projectId,
    sections: emptySections(),
    answers: [],
    ...overrides,
  };
}

function makeResume(): ProjectResumeDetail {
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
      hasExistingWebsite: false,
      existingWebsiteUrl: null,
      businessDescription: "Taco Shop",
      thirdAnswerKey: "outcome",
      thirdAnswer: "want to sell more tacos",
    },
  };
}

const researchReady = {
  status: "ready" as const,
  data: {
    ok: true as const,
    projectId,
    runs: [
      {
        id: runId,
        kind: "INITIAL_WHOLE_SITE" as const,
        status: "SUCCEEDED" as const,
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
        classification: "DISCOVERED" as const,
        observedAt: "2026-04-01T00:00:00.000Z",
        safeMetadata: {},
      },
    ],
    candidates: [
      {
        id: candidateId,
        researchRunId: runId,
        fieldKey: "business.name",
        extractedValue: "Taco Shop",
        derivation: "DISCOVERED" as const,
        disposition: "PENDING" as const,
        advisoryConfidence: 0.5,
        observedAt: "2026-04-01T00:00:00.000Z",
        sourceIds: [sourceId],
      },
    ],
  },
};

describe("DeeperOnboardingFlow authoritative sync lock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveOnboardingSectionAction.mockResolvedValue({
      ok: true,
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
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("disables onboarding editors and navigation while accept reconciliation is in flight", async () => {
    let resolveReconcile: (value: unknown) => void = () => undefined;
    reconcileResearchCandidateAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReconcile = resolve;
        }),
    );

    render(
      <DeeperOnboardingFlow
        projectId={projectId}
        research={researchReady}
        resume={makeResume()}
        onboarding={makeOnboarding()}
      />,
    );

    const nameInput = screen.getByLabelText(/Business name/i);
    expect(nameInput).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled(); // first stage

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(reconcileResearchCandidateAction).toHaveBeenCalled());
    expect(nameInput).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Brand/i })).toBeDisabled();

    await act(async () => {
      resolveReconcile({
        ok: true,
        reconcile: {
          ok: true,
          replayed: false,
          projectId,
          candidateId,
          disposition: "ACCEPTED",
          fieldKey: "business.name",
          sectionKey: "BUSINESS",
          sectionVersion: 1,
          answerVersion: 1,
          completedAt: null,
        },
        onboarding: makeOnboarding({
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
        }),
        research: {
          ...researchReady,
          data: {
            ...researchReady.data,
            candidates: [
              {
                ...researchReady.data.candidates[0]!,
                disposition: "ACCEPTED",
              },
            ],
          },
        },
      });
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue" })).not.toBeDisabled(),
    );
  });
});
