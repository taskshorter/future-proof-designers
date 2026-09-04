import Link from "next/link";

import { siteConfig } from "@/config/site";

import { SignOutButton } from "./auth/SignOutButton";
import { SiteNav } from "./SiteNav";

export function SiteHeaderActions({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <div className="site-header-actions">
      {isSignedIn ? (
        <SignOutButton />
      ) : (
        <>
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up">Create account</Link>
        </>
      )}
    </div>
  );
}

export function SiteHeader({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand">
          {siteConfig.name}
        </Link>
        <SiteNav />
        <SiteHeaderActions isSignedIn={isSignedIn} />
      </div>
    </header>
  );
}
