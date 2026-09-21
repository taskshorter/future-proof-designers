import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  footerCompanyNavigation,
  footerPolicyNavigation,
  primaryNavigation,
} from "@/config/site";

const removedRoutes = ["portfolio", "testimonials"] as const;

describe("unfinished placeholder routes", () => {
  it.each(removedRoutes)(
    "/%s has no public page, so it resolves through the normal 404",
    (route) => {
      for (const file of ["page.tsx", "page.ts", "page.jsx", "page.js", "route.ts"]) {
        const path = fileURLToPath(new URL(`../app/${route}/${file}`, import.meta.url));
        expect(existsSync(path)).toBe(false);
      }
    },
  );

  it("is not linked from primary or footer navigation", () => {
    const hrefs = [
      ...primaryNavigation,
      ...footerCompanyNavigation,
      ...footerPolicyNavigation,
    ].map((item) => item.href);

    for (const route of removedRoutes) {
      expect(hrefs).not.toContain(`/${route}`);
    }
  });
});
