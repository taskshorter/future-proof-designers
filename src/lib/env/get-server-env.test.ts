import { afterEach, describe, expect, it } from "vitest";

import { getServerEnv, resetServerEnvCache } from "./get-server-env";
import { EnvValidationError } from "./schema";

describe("getServerEnv", () => {
  afterEach(() => {
    resetServerEnvCache();
  });

  it("parses and memoizes validated server env", () => {
    const previousApp = process.env.APP_ENV;
    const previousPublic = process.env.NEXT_PUBLIC_APP_ENV;
    process.env.APP_ENV = "local";
    process.env.NEXT_PUBLIC_APP_ENV = "local";

    try {
      const first = getServerEnv();
      const second = getServerEnv();
      expect(first).toEqual({
        APP_ENV: "local",
        NEXT_PUBLIC_APP_ENV: "local",
      });
      expect(second).toBe(first);
    } finally {
      if (previousApp === undefined) {
        delete process.env.APP_ENV;
      } else {
        process.env.APP_ENV = previousApp;
      }
      if (previousPublic === undefined) {
        delete process.env.NEXT_PUBLIC_APP_ENV;
      } else {
        process.env.NEXT_PUBLIC_APP_ENV = previousPublic;
      }
    }
  });

  it("throws when APP_ENV is invalid", () => {
    const previousApp = process.env.APP_ENV;
    process.env.APP_ENV = "staging";

    try {
      expect(() => getServerEnv()).toThrow(EnvValidationError);
    } finally {
      if (previousApp === undefined) {
        delete process.env.APP_ENV;
      } else {
        process.env.APP_ENV = previousApp;
      }
    }
  });
});
