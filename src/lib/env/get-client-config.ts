import { parsePublicEnv, toClientSafeConfig } from "./schema";

/**
 * Returns client-safe configuration derived from public env.
 * Does not expose server-only keys.
 */
export function getClientSafeConfig() {
  const publicEnv = parsePublicEnv({
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  return toClientSafeConfig(publicEnv);
}
