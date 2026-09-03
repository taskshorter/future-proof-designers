import { describe, expect, it } from "vitest";

import {
  EnvValidationError,
  parsePublicEnv,
  parseServerEnv,
  toClientSafeConfig,
} from "./schema";

describe("parseServerEnv", () => {
  it("accepts a matching local environment", () => {
    expect(
      parseServerEnv({
        APP_ENV: "local",
        NEXT_PUBLIC_APP_ENV: "local",
      }),
    ).toEqual({
      APP_ENV: "local",
      NEXT_PUBLIC_APP_ENV: "local",
    });
  });

  it("allows APP_ENV without a public mirror", () => {
    expect(parseServerEnv({ APP_ENV: "preview" })).toEqual({
      APP_ENV: "preview",
    });
  });

  it("rejects mismatched environment classes", () => {
    expect(() =>
      parseServerEnv({
        APP_ENV: "local",
        NEXT_PUBLIC_APP_ENV: "production",
      }),
    ).toThrow(EnvValidationError);
  });

  it("rejects missing APP_ENV", () => {
    expect(() => parseServerEnv({})).toThrow(EnvValidationError);
  });
});

describe("parsePublicEnv", () => {
  it("accepts a valid public environment class", () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_APP_ENV: "production" })).toEqual({
      NEXT_PUBLIC_APP_ENV: "production",
    });
  });

  it("rejects an invalid public environment class", () => {
    expect(() =>
      parsePublicEnv({ NEXT_PUBLIC_APP_ENV: "staging" }),
    ).toThrow(EnvValidationError);
  });
});

describe("toClientSafeConfig", () => {
  it("exposes only client-safe fields", () => {
    expect(
      toClientSafeConfig({ NEXT_PUBLIC_APP_ENV: "preview" }),
    ).toEqual({ environmentClass: "preview" });
  });
});
