import Link from "next/link";

import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <div className="page-stack">
      <h1>{siteConfig.name}</h1>
      <p>{siteConfig.tagline}</p>
      <div className="panel">
        <p className="muted">
          Start a website project with three short discovery questions. Sign in to
          save your work and return to it later.
        </p>
        <Link href="/start" className="button-link">
          Start website project
        </Link>
      </div>
    </div>
  );
}
