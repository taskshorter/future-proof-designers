export const siteConfig = {
  name: "FPDesigner",
  shortName: "FPDesigner",
  legalName: "Future Proof Designers LLC",
  domain: "fpdesigner.com",
  url: "https://fpdesigner.com",
  title: "FPDesigner — Custom websites and software by Future Proof Designers LLC",
  description:
    "FPDesigner is the custom website and software brand of Future Proof Designers LLC, which builds custom business websites, web applications and software products for businesses.",
  tagline: "Custom websites and software for businesses.",
  operatorStatement: "FPDesigner is operated by Future Proof Designers LLC.",
  bookLocalStatement:
    "BookLocal is a software product of Future Proof Designers LLC.",
} as const;

/**
 * Public customer-service contact details for Future Proof Designers LLC.
 *
 * Each value stays `null` until the owner supplies a genuine, monitored
 * channel. The Contact page renders only what is set here and never
 * fabricates a channel. `supportEmail` is the owner-confirmed customer-support
 * mailbox; it is not an @fpdesigner.com address.
 */
export type PublicContactDetails = {
  supportEmail: string | null;
  phone: string | null;
  mailingAddress: string | null;
};

export const publicContact: PublicContactDetails = {
  supportEmail: "info@taskshorter.com",
  phone: null,
  mailingAddress: null,
};

export type NavItem = {
  href: string;
  label: string;
};

export const primaryNavigation: readonly NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/start", label: "Start" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/products", label: "Products" },
  { href: "/contact", label: "Contact" },
  { href: "/portal", label: "Portal" },
] as const;

export const footerCompanyNavigation: readonly NavItem[] = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/products", label: "Products" },
  { href: "/contact", label: "Contact" },
] as const;

export const footerPolicyNavigation: readonly NavItem[] = [
  { href: "/refund-policy", label: "Refund & Dispute Policy" },
  { href: "/cancellation-policy", label: "Cancellation Policy" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
] as const;
