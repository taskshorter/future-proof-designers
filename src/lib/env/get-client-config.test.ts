import { afterEach, describe, expect, it } from "vitest";

import { getClientSafeConfig } from "./get-client-config";

describe("getClientSafeConfig", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_ENV;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });

  it("returns Supabase publishable config only", () => {
    process.env.NEXT_PUBLIC_APP_ENV = "local";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key";

    expect(getClientSafeConfig()).toEqual({
      environmentClass: "local",
      supabaseUrl: "http://127.0.0.1:54321",
      supabasePublishableKey: "publishable-key",
    });
  });
});
