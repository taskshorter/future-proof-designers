import { describe, expect, it } from "vitest";

import {
  PROJECT_LIFECYCLE_STATES,
  projectResumeDetailSuccessSchema,
  projectResumeListSuccessSchema,
  resumeProjectSummarySchema,
} from "@/lib/factory/contract";

const baseResume = {
  projectId: "00000000-0000-4000-8000-000000000013",
  projectName: "Bakery",
  customerId: "00000000-0000-4000-8000-000000000010",
  customerName: "Owner",
  businessId: "00000000-0000-4000-8000-000000000011",
  websiteId: "00000000-0000-4000-8000-000000000012",
  requiredAction: "CUSTOMER",
  commercialState: "NOT_REQUIRED",
  provisioningState: "NOT_STARTED",
  operationalHealth: "HEALTHY",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("project resume lifecycle durability", () => {
  it("mirrors the canonical Factory A3 lifecycle enum", () => {
    expect([...PROJECT_LIFECYCLE_STATES]).toEqual([
      "DRAFT",
      "ONBOARDING",
      "PLANNING",
      "PRODUCTION",
      "OWNER_REVIEW",
      "CUSTOMER_REVIEW",
      "LAUNCH_READY",
      "LIVE",
      "MAINTENANCE",
      "PAUSED",
      "CLOSED",
    ]);
  });

  it("parses ONBOARDING and PLANNING resume summaries", () => {
    expect(
      resumeProjectSummarySchema.parse({
        ...baseResume,
        lifecycleState: "ONBOARDING",
      }).lifecycleState,
    ).toBe("ONBOARDING");
    expect(
      resumeProjectSummarySchema.parse({
        ...baseResume,
        lifecycleState: "PLANNING",
      }).lifecycleState,
    ).toBe("PLANNING");
  });

  it("rejects unknown lifecycle states", () => {
    expect(() =>
      resumeProjectSummarySchema.parse({
        ...baseResume,
        lifecycleState: "AVAILABLE",
      }),
    ).toThrow();
    expect(() =>
      resumeProjectSummarySchema.parse({
        ...baseResume,
        lifecycleState: "not-a-state",
      }),
    ).toThrow();
  });

  it("parses resume detail and list payloads after B3 PLANNING", () => {
    const detail = projectResumeDetailSuccessSchema.parse({
      ok: true,
      project: { ...baseResume, lifecycleState: "PLANNING" },
      intake: null,
    });
    expect(detail.project.lifecycleState).toBe("PLANNING");

    const list = projectResumeListSuccessSchema.parse({
      ok: true,
      projects: [
        { ...baseResume, lifecycleState: "ONBOARDING" },
        {
          ...baseResume,
          projectId: "00000000-0000-4000-8000-000000000014",
          lifecycleState: "PLANNING",
        },
      ],
    });
    expect(list.projects.map((p) => p.lifecycleState)).toEqual([
      "ONBOARDING",
      "PLANNING",
    ]);
  });
});
