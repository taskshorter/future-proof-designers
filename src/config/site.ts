export const siteConfig = {
  name: "FPDesigner",
  shortName: "FPDesigner",
  description:
    "Custom websites for businesses. Application foundation under active rebuild.",
  tagline: "Custom websites for businesses.",
} as const;

export type NavItem = {
  href: string;
  label: string;
};

export const primaryNavigation: readonly NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/contact", label: "Contact" },
] as const;
