import { getVerifiedServerAuthUserId } from "@/lib/supabase/server";

import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const userId = await getVerifiedServerAuthUserId();
  const isSignedIn = Boolean(userId);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <SiteHeader isSignedIn={isSignedIn} />
      <main id="main-content" className="site-main">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
