import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>
          <strong>{siteConfig.name}</strong>
        </p>
        <p className="muted">
          Application foundation (B1-P0). Auth and product integrations are not
          included in this release.
        </p>
      </div>
    </footer>
  );
}
