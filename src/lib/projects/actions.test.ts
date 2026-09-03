import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FactoryErrorCategory } from "@/lib/factory/contract";
import {
  loadPortalResumeState,
  loadProjectResumeDetail,
  submitProjectStartAction,
} from "./actions";

const getVerifiedAccessToken = vi.fn();
const getProjectResumeDetail = vi.fn();
const startOrSaveProject = vi.fn();
const listResumeProjects = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getVerifiedAccessToken: () => getVerifiedAccessToken(),
}));

vi.mock("@/lib/factory/gateway", () => ({
  getProjectResumeDetail: (...args: unknown[]) => getProjectResumeDetail(...args),
  startOrSaveProject: (...args: unknown[]) => startOrSaveProject(...args),
  listResumeProjects: (...args: unknown[]) => listResumeProjects(...args),
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

describe("loadPortalResumeState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVerifiedAccessToken.mockResolvedValue("access-token");
  });

  it("returns success with a genuine empty project list", async () => {
    listResumeProjects.mockResolvedValue({ ok: true, data: [] });

    const state = await loadPortalResumeState();

    expect(state).toEqual({ status: "success", projects: [] });
  });

  it("returns structured error for temporary_failure instead of empty success", async () => {
    listResumeProjects.mockResolvedValue({
      ok: false,
      category: "temporary_failure",
      message: "Retry",
    });

    const state = await loadPortalResumeState();

    expect(state).toEqual({
      status: "error",
      category: "temporary_failure",
      message: "The service is temporarily unavailable. Please try again.",
    });
    expect(state.status).not.toBe("success");
  });

  it("returns structured error for internal_error instead of empty success", async () => {
    listResumeProjects.mockResolvedValue({
      ok: false,
      category: "internal_error",
      message: "Fail",
    });

    const state = await loadPortalResumeState();

    expect(state.status).toBe("error");
    if (state.status === "error") {
      expect(state.category).toBe("internal_error");
    }
  });

  it("returns reauth for session_expired list failures", async () => {
    listResumeProjects.mockResolvedValue({
      ok: false,
      category: "session_expired",
      message: "Expired",
    });

    const state = await loadPortalResumeState();

    expect(state.status).toBe("reauth");
    if (state.status === "reauth") {
      expect(state.signInPath).toBe("/sign-in?next=%2Fportal");
    }
  });

  it("returns unauthenticated when local verified session is absent", async () => {
    getVerifiedAccessToken.mockResolvedValue(null);

    const state = await loadPortalResumeState();

    expect(state).toEqual({ status: "unauthenticated" });
  });
});
