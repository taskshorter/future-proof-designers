import { parsePublicEnv, toClientSafeConfig } from "./schema";

/**
 * Returns client-safe configuration derived from public env.
 * Does not expose server-only keys.
 */
export function getClientSafeConfig() {
  const publicEnv = parsePublicEnv({
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  });

  return toClientSafeConfig(publicEnv);
}
