import { describe, expect, it } from "vitest";

import { primaryNavigation, siteConfig } from "@/config/site";

describe("site configuration", () => {
  it("exposes stable brand and navigation primitives", () => {
    expect(siteConfig.name).toBe("FPDesigner");
    expect(siteConfig.description).toBe(
      "Custom websites for businesses, built around a clear and guided process.",
    );
    expect(siteConfig.description).not.toMatch(
      /foundation|rebuild|design pass|tranche|B1|B2|contract/i,
    );
    expect(primaryNavigation.map((item) => item.href)).toEqual([
      "/",
      "/start",
      "/about",
      "/portfolio",
      "/testimonials",
      "/contact",
      "/portal",
    ]);
  });
});
