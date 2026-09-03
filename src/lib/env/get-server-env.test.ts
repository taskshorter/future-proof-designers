import { afterEach, describe, expect, it } from "vitest";

import { getServerEnv, resetServerEnvCache } from "./get-server-env";
import { EnvValidationError } from "./schema";

describe("getServerEnv", () => {
  afterEach(() => {
    resetServerEnvCache();
    delete process.env.APP_ENV;
    delete process.env.NEXT_PUBLIC_APP_ENV;
    delete process.env.FACTORY_CUSTOMER_GATEWAY_URL;
  });

  it("parses and memoizes validated server env", () => {
    process.env.APP_ENV = "local";
    process.env.NEXT_PUBLIC_APP_ENV = "local";
    process.env.FACTORY_CUSTOMER_GATEWAY_URL = "http://127.0.0.1:3001";

    const first = getServerEnv();
    const second = getServerEnv();
    expect(first.FACTORY_CUSTOMER_GATEWAY_URL).toBe("http://127.0.0.1:3001");
    expect(second).toBe(first);
  });

  it("throws when gateway URL is missing", () => {
    process.env.APP_ENV = "local";
    expect(() => getServerEnv()).toThrow(EnvValidationError);
  });
});
