import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ContactPage from "../app/contact/page";
import { ContactDetails } from "@/components/ContactDetails";
import { publicContact } from "@/config/site";

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

describe("ContactPage customer copy", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders neutral product copy without internal tranche terminology", () => {
    render(<ContactPage />);

    expect(screen.getByRole("heading", { name: "Contact", level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText(/FPDesigner is operated by Future Proof Designers LLC\./),
    ).toBeInTheDocument();
    expect(screen.queryByText(/B1|B2|tranche|contract/i)).not.toBeInTheDocument();
  });

  it("no longer tells visitors to check back later", () => {
    render(<ContactPage />);

    expect(screen.queryByText(/check back later/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/aren’t available yet/i)).not.toBeInTheDocument();
  });

  it("publishes only the owner-confirmed customer support email", () => {
    const { container } = render(<ContactPage />);

    expect(container.querySelector("form")).toBeNull();
    expect(screen.getByText("Customer support email")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "info@taskshorter.com" }),
    ).toHaveAttribute("href", "mailto:info@taskshorter.com");
    expect(container.querySelectorAll('a[href^="mailto:"]')).toHaveLength(1);
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(container.textContent).not.toMatch(
      /(support|hello|contact)@fpdesigner\.com/i,
    );
    expect(container.textContent).not.toMatch(/not published on this website/i);
    expect(publicContact).toEqual({
      supportEmail: "info@taskshorter.com",
      phone: null,
      mailingAddress: null,
    });
  });

  it("links to the existing project start and portal flows", () => {
    render(<ContactPage />);

    expect(screen.getByRole("link", { name: "project start" })).toHaveAttribute(
      "href",
      "/start",
    );
    expect(screen.getByRole("link", { name: "customer portal" })).toHaveAttribute(
      "href",
      "/portal",
    );
  });
});

describe("ContactDetails", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders nothing when no channel is configured", () => {
    const { container } = render(
      <ContactDetails
        contact={{ supportEmail: null, phone: null, mailingAddress: null }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders only the channels that are configured", () => {
    render(
      <ContactDetails
        contact={{
          supportEmail: "owner@example.com",
          phone: null,
          mailingAddress: null,
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "owner@example.com" })).toHaveAttribute(
      "href",
      "mailto:owner@example.com",
    );
    expect(screen.queryByText("Phone")).not.toBeInTheDocument();
    expect(screen.queryByText("Mailing address")).not.toBeInTheDocument();
  });
});
