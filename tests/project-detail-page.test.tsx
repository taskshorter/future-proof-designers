import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ProjectDetailPage from "../app/portal/projects/[projectId]/page";
import { loadProjectResumeDetail } from "@/lib/projects/actions";

vi.mock("@/lib/projects/actions", () => ({
  loadProjectResumeDetail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
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

describe("ProjectDetailPage customer copy", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders neutral next-steps copy without internal tranche terminology", async () => {
    vi.mocked(loadProjectResumeDetail).mockResolvedValue({
      status: "success",
      data: {
        ok: true,
        project: {
          projectId: "11111111-1111-4111-8111-111111111111",
          projectName: "Website Project",
          customerId: "22222222-2222-4222-8222-222222222222",
          customerName: "Neighborhood bakery",
          businessId: "33333333-3333-4333-8333-333333333333",
          websiteId: "44444444-4444-4444-8444-444444444444",
          lifecycleState: "ONBOARDING",
          requiredAction: "CUSTOMER",
          commercialState: "NOT_REQUIRED",
          provisioningState: "NOT_REQUIRED",
          operationalHealth: "UNKNOWN",
          createdAt: "2026-09-03T00:00:00.000Z",
        },
        intake: {
          intakeRecordId: "55555555-5555-4555-8555-555555555555",
          hasExistingWebsite: false,
          existingWebsiteUrl: null,
          businessDescription: "Neighborhood bakery",
          thirdAnswerKey: "new_website_goal",
          thirdAnswer: "Need clearer hours",
        },
      },
    });

    render(
      await ProjectDetailPage({
        params: Promise.resolve({
          projectId: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );

    expect(
      screen.getByText("Your project is saved and ready for the next onboarding steps."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue onboarding" }),
    ).toHaveAttribute(
      "href",
      "/portal/projects/11111111-1111-4111-8111-111111111111/onboarding",
    );
    expect(screen.queryByText(/B1|B2|tranche|contract/i)).not.toBeInTheDocument();
  });
});
