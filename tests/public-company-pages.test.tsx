import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AboutPage from "../app/about/page";
import CancellationPolicyPage from "../app/cancellation-policy/page";
import ContactPage from "../app/contact/page";
import HomePage from "../app/page";
import PrivacyPage from "../app/privacy/page";
import ProductsPage from "../app/products/page";
import RefundPolicyPage from "../app/refund-policy/page";
import ServicesPage from "../app/services/page";
import TermsPage from "../app/terms/page";
import { SiteFooter } from "@/components/SiteFooter";

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

vi.mock("@/lib/supabase/server", () => ({
  getVerifiedServerAuthUserId: vi.fn(async () => null),
}));

const LEGAL_NAME = "Future Proof Designers LLC";
const BOOKLOCAL_STATEMENT =
  "BookLocal is a software product of Future Proof Designers LLC.";

const publicPages = [
  ["home", HomePage],
  ["about", AboutPage],
  ["services", ServicesPage],
  ["products", ProductsPage],
  ["contact", ContactPage],
  ["refund policy", RefundPolicyPage],
  ["cancellation policy", CancellationPolicyPage],
  ["terms", TermsPage],
  ["privacy", PrivacyPage],
] as const;

describe("public company pages", () => {
  afterEach(() => {
    cleanup();
  });

  describe("home page", () => {
    it("identifies Future Proof Designers LLC and the FPDesigner brand", () => {
      render(<HomePage />);

      expect(
        screen.getByText(/FPDesigner is operated by Future Proof Designers LLC\./),
      ).toBeInTheDocument();
      expect(screen.getAllByText(LEGAL_NAME).length).toBeGreaterThan(0);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "FPDesigner",
      );
    });

    it("explains the services offered", () => {
      render(<HomePage />);

      expect(
        screen.getByRole("heading", { name: "Custom business websites" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Web applications and custom software" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Integrations and automation" }),
      ).toBeInTheDocument();
    });

    it("states the BookLocal relationship without availability claims", () => {
      render(<HomePage />);

      expect(screen.getByText(BOOKLOCAL_STATEMENT)).toBeInTheDocument();
      expect(
        screen.queryByText(/now available|launched|accepting customers|pricing/i),
      ).not.toBeInTheDocument();
    });

    it("keeps the existing /start call to action and adds a contact link", () => {
      render(<HomePage />);

      expect(screen.getByRole("link", { name: "Start website project" })).toHaveAttribute(
        "href",
        "/start",
      );
      expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute(
        "href",
        "/contact",
      );
    });
  });

  describe("about page", () => {
    it("identifies the legal company, brand and BookLocal", () => {
      render(<AboutPage />);

      expect(
        screen.getByText(/Future Proof Designers LLC is a company that builds custom software/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/FPDesigner is operated by Future Proof Designers LLC\./, {
          exact: false,
        }),
      ).toBeInTheDocument();
      expect(screen.getByText(BOOKLOCAL_STATEMENT, { exact: false })).toBeInTheDocument();
    });
  });

  describe("services page", () => {
    it("describes each service and states that pricing depends on scope", () => {
      render(<ServicesPage />);

      expect(screen.getByRole("heading", { name: "Services", level: 1 })).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Custom business websites" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Web applications and custom software" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Integrations and automation" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/pricing depend on the requirements agreed/i),
      ).toBeInTheDocument();
      expect(screen.queryByText(/\$\s?\d/)).not.toBeInTheDocument();
    });
  });

  describe("products page", () => {
    it("identifies BookLocal as a product of Future Proof Designers LLC", () => {
      render(<ProductsPage />);

      expect(screen.getByRole("heading", { name: "BookLocal" })).toBeInTheDocument();
      expect(screen.getByText(BOOKLOCAL_STATEMENT)).toBeInTheDocument();
      expect(screen.queryByText(/checkout|buy now|\$\s?\d/i)).not.toBeInTheDocument();
    });

    it("makes no availability, module or plan claims about BookLocal", () => {
      const { container } = render(<ProductsPage />);

      expect(container.textContent).not.toMatch(
        /optional module|website plan|available|launch|now live|accepting|customers|pricing (starts|from)/i,
      );
    });
  });

  describe("policy routes", () => {
    it.each([
      ["Refund & Dispute Policy", RefundPolicyPage],
      ["Cancellation Policy", CancellationPolicyPage],
      ["Terms of Service", TermsPage],
      ["Privacy Policy", PrivacyPage],
    ] as const)("%s renders its heading and names the operator", (heading, Page) => {
      render(<Page />);

      expect(screen.getByRole("heading", { name: heading, level: 1 })).toBeInTheDocument();
      expect(screen.getAllByText(new RegExp(LEGAL_NAME)).length).toBeGreaterThan(0);
    });

    it("refund policy does not promise an unconditional refund", () => {
      render(<RefundPolicyPage />);

      expect(screen.getByText(/unconditional refund right is not offered/i)).toBeInTheDocument();
      expect(screen.queryByText(/money-back|full refund|\d+[- ]day/i)).not.toBeInTheDocument();
    });

    it("refund policy has an explicit billing disputes section that preserves payment-network rights", () => {
      render(<RefundPolicyPage />);

      expect(screen.getByRole("heading", { name: "Billing disputes" })).toBeInTheDocument();
      expect(
        screen.getByText(/review billing concerns against the applicable project and payment records/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/limits any rights available to you through your payment method provider/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/does not require you to contact us before/i)).toBeInTheDocument();
      expect(
        screen.queryByText(/within \d+|\d+ (business )?days|response time|dispute fee|chargeback fee/i),
      ).not.toBeInTheDocument();
    });

    it("cancellation policy does not invent a window or fees", () => {
      render(<CancellationPolicyPage />);

      expect(
        screen.getByText(/does not set a cancellation window or cancellation fees/i),
      ).toBeInTheDocument();
      expect(screen.queryByText(/\d+[- ]day|\$\s?\d/i)).not.toBeInTheDocument();
    });

    it("terms omit unapproved governing-law and liability provisions", () => {
      render(<TermsPage />);

      expect(
        screen.queryByText(/arbitration|governing law|jurisdiction|indemnif|liability cap/i),
      ).not.toBeInTheDocument();
    });

    it("terms use the owner-approved customer content ownership wording", () => {
      render(<TermsPage />);

      expect(
        screen.getByText(
          /You retain ownership of content you submit, subject to any project-specific agreement and the permissions necessary for us to provide the services\./,
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText(/remains yours/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/work[- ]for[- ]hire|exclusive|perpetual|assign(s|ed|ment)? (all|to)/i),
      ).not.toBeInTheDocument();
    });

    it("privacy policy states no sale of personal information and avoids tracker claims", () => {
      render(<PrivacyPage />);

      expect(
        screen.getByText(/does not sell personal information/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/analytics|advertis|SOC ?2|HIPAA|certified/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("footer", () => {
    it("identifies the company and links to company pages and policies", () => {
      render(<SiteFooter />);

      const footer = screen.getByRole("contentinfo");
      expect(within(footer).getByText(LEGAL_NAME)).toBeInTheDocument();
      expect(
        within(footer).getByText("FPDesigner is operated by Future Proof Designers LLC."),
      ).toBeInTheDocument();

      const expectedLinks: Record<string, string> = {
        About: "/about",
        Services: "/services",
        Products: "/products",
        Contact: "/contact",
        "Refund & Dispute Policy": "/refund-policy",
        "Cancellation Policy": "/cancellation-policy",
        Terms: "/terms",
        Privacy: "/privacy",
      };

      for (const [name, href] of Object.entries(expectedLinks)) {
        expect(within(footer).getByRole("link", { name })).toHaveAttribute("href", href);
      }
    });
  });

  describe("metadata", () => {
    it("identifies Future Proof Designers LLC and FPDesigner", async () => {
      const { metadata } = await import("../app/layout");

      const title = metadata.title as { default: string; template: string };
      expect(title.default).toContain("FPDesigner");
      expect(title.default).toContain(LEGAL_NAME);
      expect(title.template).toContain("FPDesigner");
      expect(metadata.description).toContain(LEGAL_NAME);
      expect(metadata.description).toContain("FPDesigner");
      expect(metadata.publisher).toBe(LEGAL_NAME);
    });
  });

  describe("across all public pages", () => {
    it.each(publicPages)("%s contains no legacy placeholder identity or internal terminology", (_name, Page) => {
      const { container } = render(<Page />);

      expect(container.textContent).not.toMatch(/google ai studio/i);
      expect(container.textContent).not.toMatch(/\b(B1|B2|tranche)\b/);
    });
  });
});
