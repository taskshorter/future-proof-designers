import { describe, expect, it } from "vitest";

import {
  ONBOARDING_FIELD_UI,
  assertOnboardingFieldCatalog,
  fieldsForSection,
  isFieldValueEmpty,
} from "./field-ui";

describe("onboarding field catalog", () => {
  it("contains exactly 41 fields with correct section counts", () => {
    const result = assertOnboardingFieldCatalog();
    expect(result.total).toBe(41);
    expect(result.counts).toEqual({
      BUSINESS: 15,
      BRAND: 8,
      CONTENT: 8,
      GOALS: 9,
      REVIEW: 1,
    });
    expect(ONBOARDING_FIELD_UI).toHaveLength(41);
  });

  it("has no duplicate field keys and correct section ownership", () => {
    const keys = ONBOARDING_FIELD_UI.map((field) => field.fieldKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const field of ONBOARDING_FIELD_UI) {
      expect(field.fieldKey.startsWith(`${field.sectionKey.toLowerCase()}.`) || true).toBe(
        true,
      );
      const prefix = field.sectionKey.toLowerCase();
      expect(field.fieldKey.startsWith(`${prefix}.`)).toBe(true);
    }
    expect(fieldsForSection("REVIEW").map((field) => field.fieldKey)).toEqual([
      "review.catch_all",
    ]);
    expect(fieldsForSection("BUSINESS").find((field) => field.fieldKey === "business.name")?.removable).toBe(
      false,
    );
  });

  it("treats empty values as empty for omission logic", () => {
    expect(isFieldValueEmpty("")).toBe(true);
    expect(isFieldValueEmpty("  ")).toBe(true);
    expect(isFieldValueEmpty([])).toBe(true);
    expect(isFieldValueEmpty({ phone: "", email: "" })).toBe(true);
    expect(isFieldValueEmpty("Taco Shop")).toBe(false);
    expect(isFieldValueEmpty(["a"])).toBe(false);
  });
});
