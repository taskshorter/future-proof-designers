import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import HomePage from "../app/page";

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

describe("HomePage customer copy", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders neutral product copy without internal tranche terminology", () => {
    render(<HomePage />);

    expect(
      screen.getByText(
        "Start a website project with three short discovery questions. Sign in to save your work and return to it later.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start website project" })).toHaveAttribute(
      "href",
      "/start",
    );
    expect(screen.queryByText(/B1|B2|tranche|contract/i)).not.toBeInTheDocument();
  });
});
