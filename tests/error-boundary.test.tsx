import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ErrorBoundary from "../app/error";

describe("Error boundary", () => {
  it("does not render raw error details and shows generic safe copy", () => {
    const sensitiveMessage =
      "SUPABASE_SECRET_KEY=super-secret-token DATABASE_URL=postgresql://admin:password@prod";

    render(
      <ErrorBoundary
        error={
          new Error(sensitiveMessage) as Error & {
            digest?: string;
          }
        }
        reset={vi.fn()}
      />,
    );

    expect(
      screen.queryByText(sensitiveMessage, { exact: false }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("An unexpected error occurred.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
