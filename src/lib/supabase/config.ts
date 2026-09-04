import { getClientSafeConfig } from "@/lib/env/get-client-config";

export function getSupabaseBrowserConfig() {
  const config = getClientSafeConfig();
  return {
    url: config.supabaseUrl,
    publishableKey: config.supabasePublishableKey,
  };
}
