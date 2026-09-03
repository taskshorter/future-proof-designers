import Link from "next/link";

import { siteConfig } from "@/config/site";

import { SignOutButton } from "./auth/SignOutButton";
import { SiteNav } from "./SiteNav";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand">
          {siteConfig.name}
        </Link>
        <SiteNav />
        <div className="site-header-actions">
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up">Create account</Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
