import { describe, expect, it } from "vitest";

import { primaryNavigation, siteConfig } from "@/config/site";

describe("site configuration", () => {
  it("exposes stable brand and navigation primitives", () => {
    expect(siteConfig.name).toBe("FPDesigner");
    expect(primaryNavigation.map((item) => item.href)).toEqual([
      "/",
      "/about",
      "/portfolio",
      "/testimonials",
      "/contact",
    ]);
  });
});
