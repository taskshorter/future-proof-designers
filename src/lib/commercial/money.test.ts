import { describe, expect, it } from "vitest";

import { formatMinorUnits } from "./money";

describe("formatMinorUnits", () => {
  it("formats a 2-decimal currency", () => {
    const result = formatMinorUnits(125099, "USD");
    expect(result.ok).toBe(true);
    expect(result.text).toContain("1,250.99");
  });

  it("formats a 0-decimal currency", () => {
    const result = formatMinorUnits(1250, "JPY");
    expect(result.ok).toBe(true);
    expect(result.text.replace(/[^\d]/g, "")).toContain("1250");
  });

  it("formats a 3-decimal currency when Intl supports it", () => {
    const digits = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BHD",
    }).resolvedOptions().maximumFractionDigits;
    if (digits !== 3) {
      expect(true).toBe(true);
      return;
    }
    const result = formatMinorUnits(1250, "BHD");
    expect(result.ok).toBe(true);
    expect(result.text).toMatch(/1\.250/);
  });

  it("fails safely for invalid currency codes", () => {
    const result = formatMinorUnits(100, "ZZ");
    expect(result.ok).toBe(false);
    expect(result.text).toBe("Amount unavailable");
  });
});
