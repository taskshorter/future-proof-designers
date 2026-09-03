import Link from "next/link";

import { siteConfig } from "@/config/site";

import { SiteNav } from "./SiteNav";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand">
          {siteConfig.name}
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
