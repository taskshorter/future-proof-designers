import { describe, expect, it } from "vitest";

import * as rootExports from "./index";
import * as publicExports from "./public";

describe("env module boundaries", () => {
  it("exposes only environment-neutral symbols from the root entry", () => {
    expect(Object.keys(rootExports).sort()).toEqual([
      "ENVIRONMENT_CLASSES",
      "ENVIRONMENT_CLASS_LABELS",
    ]);
  });

  it("keeps parsing helpers off the root entry", () => {
    expect(rootExports).not.toHaveProperty("parseServerEnv");
    expect(rootExports).not.toHaveProperty("parsePublicEnv");
  });

  it("exposes public parsing on the public entry", () => {
    expect(publicExports).toHaveProperty("parsePublicEnv");
    expect(publicExports).not.toHaveProperty("parseServerEnv");
  });
});
