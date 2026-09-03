import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>
          <strong>{siteConfig.name}</strong>
        </p>
        <p className="muted">
          Custom websites for businesses — clear process, lasting structure.
        </p>
      </div>
    </footer>
  );
}
