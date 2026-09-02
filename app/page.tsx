import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <div className="page-stack">
      <h1>{siteConfig.name}</h1>
      <p>{siteConfig.tagline}</p>
      <div className="panel">
        <p className="muted">
          This is the B1-P0 application foundation. Public pages are present for
          routing continuity. Product features, authentication, and integrations
          arrive in later authorized workstreams.
        </p>
      </div>
    </div>
  );
}
