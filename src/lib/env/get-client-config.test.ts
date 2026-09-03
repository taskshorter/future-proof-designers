import { describe, expect, it } from "vitest";

import { getClientSafeConfig } from "./get-client-config";
import { EnvValidationError } from "./schema";

describe("getClientSafeConfig", () => {
  it("returns environmentClass from public env", () => {
    const previous = process.env.NEXT_PUBLIC_APP_ENV;
    process.env.NEXT_PUBLIC_APP_ENV = "local";

    try {
      expect(getClientSafeConfig()).toEqual({ environmentClass: "local" });
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_APP_ENV;
      } else {
        process.env.NEXT_PUBLIC_APP_ENV = previous;
      }
    }
  });

  it("throws when public env is missing", () => {
    const previous = process.env.NEXT_PUBLIC_APP_ENV;
    delete process.env.NEXT_PUBLIC_APP_ENV;

    try {
      expect(() => getClientSafeConfig()).toThrow(EnvValidationError);
    } finally {
      if (previous !== undefined) {
        process.env.NEXT_PUBLIC_APP_ENV = previous;
      }
    }
  });
});
