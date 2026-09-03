import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FactoryErrorCategory } from "@/lib/factory/contract";
import {
  loadProjectResumeDetail,
  submitProjectStartAction,
} from "./actions";

const getVerifiedAccessToken = vi.fn();
const getProjectResumeDetail = vi.fn();
const startOrSaveProject = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getVerifiedAccessToken: () => getVerifiedAccessToken(),
}));

vi.mock("@/lib/factory/gateway", () => ({
  getProjectResumeDetail: (...args: unknown[]) => getProjectResumeDetail(...args),
  startOrSaveProject: (...args: unknown[]) => startOrSaveProject(...args),
  listResumeProjects: vi.fn(),
}));

const completeAnswers = {
  hasExistingWebsite: false as const,
  existingWebsiteUrl: null,
  businessDescription: "Neighborhood bakery",
  thirdAnswer: "More orders",
};

describe("project actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVerifiedAccessToken.mockResolvedValue("access-token");
  });

  it("maps Factory categories structurally without message substring heuristics", async () => {
    startOrSaveProject.mockResolvedValue({
      ok: false,
      category: "invalid_input",
      message: "Invalid request",
    });

    const result = await submitProjectStartAction({
      operationId: "00000000-0000-4000-8000-000000000099",
      answers: completeAnswers,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.category).toBe("invalid_input");
      expect(result.message).not.toContain("Account selection");
    }
  });

  it("returns reauth state for session_expired project detail failures", async () => {
    getProjectResumeDetail.mockResolvedValue({
      ok: false,
      category: "session_expired",
      message: "Expired",
    });

    const result = await loadProjectResumeDetail(
      "00000000-0000-4000-8000-000000000013",
    );

    expect(result).toEqual({
      status: "reauth",
      message: "Your session expired. Sign in again to continue.",
      signInPath: "/sign-in?next=%2Fportal%2Fprojects%2F00000000-0000-4000-8000-000000000013",
    });
  });

  it("returns opaque not_found for missing projects", async () => {
    getProjectResumeDetail.mockResolvedValue({
      ok: false,
      category: "not_found",
      message: "Missing",
    });

    const result = await loadProjectResumeDetail(
      "00000000-0000-4000-8000-000000000013",
    );
    expect(result).toEqual({ status: "not_found" });
  });

  it("does not convert temporary_failure into not_found", async () => {
    getProjectResumeDetail.mockResolvedValue({
      ok: false,
      category: "temporary_failure",
      message: "Retry",
    });

    const result = await loadProjectResumeDetail(
      "00000000-0000-4000-8000-000000000013",
    );

    expect(result).toEqual({
      status: "error",
      category: "temporary_failure",
      message: "The service is temporarily unavailable. Please try again.",
    });
  });

  it("does not convert internal_error into not_found", async () => {
    getProjectResumeDetail.mockResolvedValue({
      ok: false,
      category: "internal_error",
      message: "Fail",
    });

    const result = await loadProjectResumeDetail(
      "00000000-0000-4000-8000-000000000013",
    );

    expect(result).toEqual({
      status: "error",
      category: "internal_error",
      message: "Something went wrong. Please try again later.",
    });
  });

  it("returns safe permission_denied handling without resource details", async () => {
    getProjectResumeDetail.mockResolvedValue({
      ok: false,
      category: "permission_denied",
      message: "Denied",
    });

    const result = await loadProjectResumeDetail(
      "00000000-0000-4000-8000-000000000013",
    );

    expect(result).toEqual({
      status: "error",
      category: "permission_denied",
      message: "We could not access that project.",
    });
  });

  it.each([
    "auth_required",
    "session_expired",
  ] satisfies FactoryErrorCategory[])(
    "returns reauth for %s on project detail",
    async (category) => {
      getProjectResumeDetail.mockResolvedValue({
        ok: false,
        category,
        message: "Auth",
      });

      const result = await loadProjectResumeDetail(
        "00000000-0000-4000-8000-000000000013",
      );

      expect(result.status).toBe("reauth");
    },
  );
});
