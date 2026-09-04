import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./schema";

describe("parseServerEnv", () => {
  it("accepts local Supabase and gateway URLs", () => {
    expect(
      parseServerEnv({
        APP_ENV: "local",
        NEXT_PUBLIC_APP_ENV: "local",
        FACTORY_CUSTOMER_GATEWAY_URL: "http://127.0.0.1:3001",
      }),
    ).toMatchObject({
      APP_ENV: "local",
      FACTORY_CUSTOMER_GATEWAY_URL: "http://127.0.0.1:3001",
    });
  });

  it("requires HTTPS gateway URL outside local development", () => {
    expect(() =>
      parseServerEnv({
        APP_ENV: "production",
        FACTORY_CUSTOMER_GATEWAY_URL: "http://127.0.0.1:3001",
      }),
    ).toThrow();
  });
});
