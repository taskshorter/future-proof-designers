import { describe, expect, it } from "vitest";

import { FORBIDDEN_CLIENT_ENV_KEYS, parsePublicEnv, toClientSafeConfig } from "./schema";

describe("B1-P1 client env boundary", () => {
  it("exposes only publishable Supabase values to client config", () => {
    const publicEnv = parsePublicEnv({
      NEXT_PUBLIC_APP_ENV: "local",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    });

    expect(toClientSafeConfig(publicEnv)).toEqual({
      environmentClass: "local",
      supabaseUrl: "http://127.0.0.1:54321",
      supabasePublishableKey: "publishable-key",
    });
    expect(toClientSafeConfig(publicEnv)).not.toHaveProperty(
      "FACTORY_CUSTOMER_GATEWAY_URL",
    );
  });

  it("documents forbidden client env keys", () => {
    expect(FORBIDDEN_CLIENT_ENV_KEYS).toContain("FACTORY_CUSTOMER_GATEWAY_URL");
    expect(FORBIDDEN_CLIENT_ENV_KEYS).toContain("SUPABASE_SECRET_KEY");
  });
});
