import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import ContactPage from "../app/contact/page";

describe("ContactPage customer copy", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders neutral product copy without internal tranche terminology", () => {
    render(<ContactPage />);

    expect(
      screen.getByText(
        "Contact and booking options aren’t available yet. Please check back later.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/B1|B2|tranche|contract/i)).not.toBeInTheDocument();
  });
});
