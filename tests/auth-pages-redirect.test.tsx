import { cleanup, render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SignInPage from "../app/sign-in/page";
import SignUpPage from "../app/sign-up/page";
import { getVerifiedServerAuthUserId } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  getVerifiedServerAuthUserId: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/auth/actions", () => ({
  signInAction: vi.fn(),
  signUpAction: vi.fn(),
}));

describe("authenticated auth-page redirects", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.mocked(getVerifiedServerAuthUserId).mockResolvedValue(null);
  });

  it("renders sign-in form when signed out", async () => {
    render(await SignInPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("renders create-account form when signed out", async () => {
    render(await SignUpPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Create account" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("passes sanitized next to AuthForm when signed out", async () => {
    render(
      await SignInPage({
        searchParams: Promise.resolve({ next: "/start" }),
      }),
    );

    const nextInput = document.querySelector('input[name="next"]');
    expect(nextInput).toHaveAttribute("value", "/start");
  });

  it("redirects signed-in /sign-in to /portal by default", async () => {
    vi.mocked(getVerifiedServerAuthUserId).mockResolvedValue("user-1");

    await expect(
      SignInPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("REDIRECT:/portal");
    expect(redirect).toHaveBeenCalledWith("/portal");
  });

  it("redirects signed-in /sign-up to /portal by default", async () => {
    vi.mocked(getVerifiedServerAuthUserId).mockResolvedValue("user-1");

    await expect(
      SignUpPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("REDIRECT:/portal");
    expect(redirect).toHaveBeenCalledWith("/portal");
  });

  it("redirects signed-in /sign-in?next=/start to /start", async () => {
    vi.mocked(getVerifiedServerAuthUserId).mockResolvedValue("user-1");

    await expect(
      SignInPage({ searchParams: Promise.resolve({ next: "/start" }) }),
    ).rejects.toThrow("REDIRECT:/start");
    expect(redirect).toHaveBeenCalledWith("/start");
  });

  it("redirects signed-in /sign-up?next=/portal to /portal", async () => {
    vi.mocked(getVerifiedServerAuthUserId).mockResolvedValue("user-1");

    await expect(
      SignUpPage({ searchParams: Promise.resolve({ next: "/portal" }) }),
    ).rejects.toThrow("REDIRECT:/portal");
    expect(redirect).toHaveBeenCalledWith("/portal");
  });

  it("redirects signed-in unsafe external next to /portal", async () => {
    vi.mocked(getVerifiedServerAuthUserId).mockResolvedValue("user-1");

    await expect(
      SignInPage({
        searchParams: Promise.resolve({ next: "https://evil.example" }),
      }),
    ).rejects.toThrow("REDIRECT:/portal");
    expect(redirect).toHaveBeenCalledWith("/portal");
  });
});
