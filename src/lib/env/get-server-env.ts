import "server-only";

import { parseServerEnv, type ServerEnv } from "./schema";

let cached: ServerEnv | null = null;

/**
 * Returns validated server environment.
 * Safe to call from Server Components / Route Handlers.
 * B1-P0: APP_ENV / NEXT_PUBLIC_APP_ENV only — no secrets.
 */
export function getServerEnv(): ServerEnv {
  if (cached) {
    return cached;
  }

  cached = parseServerEnv({
    APP_ENV: process.env.APP_ENV,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    FACTORY_CUSTOMER_GATEWAY_URL: process.env.FACTORY_CUSTOMER_GATEWAY_URL,
  });

  return cached;
}

/** Test helper — clears the memoized env parse result. */
export function resetServerEnvCache(): void {
  cached = null;
}
