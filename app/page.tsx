import Link from "next/link";

import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <div className="page-stack">
      <h1>{siteConfig.name}</h1>
      <p>{siteConfig.tagline}</p>
      <div className="panel">
        <p className="muted">
          B1-P1 adds website entry, account sign-in, and protected project resume.
          Start with three short discovery questions.
        </p>
        <Link href="/start" className="button-link">
          Start website project
        </Link>
      </div>
    </div>
  );
}
