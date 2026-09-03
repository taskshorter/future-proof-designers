import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import AboutPage from "../app/about/page";

describe("AboutPage customer copy", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders neutral product copy without internal implementation language", () => {
    render(<AboutPage />);

    expect(
      screen.getByText(
        "FPDesigner builds custom websites for businesses through a clear, guided process.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/foundation|rebuild|design pass|tranche|B1|B2|contract/i),
    ).not.toBeInTheDocument();
  });
});
