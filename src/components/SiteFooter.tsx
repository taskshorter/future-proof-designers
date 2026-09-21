import Link from "next/link";

import {
  footerCompanyNavigation,
  footerPolicyNavigation,
  siteConfig,
} from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner footer-grid">
        <div className="footer-identity">
          <p>
            <strong>{siteConfig.legalName}</strong>
          </p>
          <p className="muted">{siteConfig.operatorStatement}</p>
          <p className="muted">
            Custom business websites, web applications and software products.
          </p>
        </div>
        <nav aria-label="Company" className="footer-nav">
          <p className="footer-nav-title">Company</p>
          <ul>
            {footerCompanyNavigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Policies" className="footer-nav">
          <p className="footer-nav-title">Policies</p>
          <ul>
            {footerPolicyNavigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="site-footer-inner footer-legal">
        <p className="muted">
          © {new Date().getFullYear()} {siteConfig.legalName}. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}
