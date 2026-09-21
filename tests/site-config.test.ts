import { describe, expect, it } from "vitest";

import { primaryNavigation, siteConfig } from "@/config/site";

describe("site configuration", () => {
  it("exposes stable brand and navigation primitives", () => {
    expect(siteConfig.name).toBe("FPDesigner");
    expect(siteConfig.legalName).toBe("Future Proof Designers LLC");
    expect(siteConfig.domain).toBe("fpdesigner.com");
    expect(siteConfig.title).toContain("Future Proof Designers LLC");
    expect(siteConfig.description).toContain("FPDesigner");
    expect(siteConfig.description).toContain("Future Proof Designers LLC");
    expect(siteConfig.description).toMatch(/custom business websites/i);
    expect(siteConfig.description).not.toMatch(
      /foundation|rebuild|design pass|tranche|B1|B2|contract|google ai studio/i,
    );
    expect(siteConfig.bookLocalStatement).toBe(
      "BookLocal is a software product of Future Proof Designers LLC.",
    );
    expect(primaryNavigation.map((item) => item.href)).toEqual([
      "/",
      "/start",
      "/about",
      "/services",
      "/products",
      "/contact",
      "/portal",
    ]);
  });
});
