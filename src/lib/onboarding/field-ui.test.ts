import { describe, expect, it } from "vitest";

import {
  ONBOARDING_FIELD_UI,
  assertOnboardingFieldCatalog,
  fieldByKey,
  fieldsForSection,
  isFieldValueEmpty,
  prepareAnswerForSave,
  semanticEqual,
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
      const prefix = field.sectionKey.toLowerCase();
      expect(field.fieldKey.startsWith(`${prefix}.`)).toBe(true);
    }
    expect(fieldsForSection("REVIEW").map((field) => field.fieldKey)).toEqual([
      "review.catch_all",
    ]);
    expect(
      fieldsForSection("BUSINESS").find((field) => field.fieldKey === "business.name")
        ?.removable,
    ).toBe(false);
  });

  it("treats empty values as empty for omission logic", () => {
    expect(isFieldValueEmpty("")).toBe(true);
    expect(isFieldValueEmpty("  ")).toBe(true);
    expect(isFieldValueEmpty([])).toBe(true);
    expect(isFieldValueEmpty([""])).toBe(true);
    expect(isFieldValueEmpty({ phone: "", email: "" })).toBe(true);
    expect(isFieldValueEmpty("Taco Shop")).toBe(false);
    expect(isFieldValueEmpty(["a"])).toBe(false);
  });
});

describe("semantic equality", () => {
  it("treats cloned complex values as unchanged", () => {
    const urls = ["https://a.example", "https://b.example"];
    expect(semanticEqual(urls, [...urls])).toBe(true);

    const offerings = [{ name: "Tacos", notes: "Soft shell" }];
    expect(semanticEqual(offerings, structuredClone(offerings))).toBe(true);

    const contact = { phone: "555", email: "a@b.c", website: "", other: "" };
    expect(semanticEqual(contact, { phone: "555", email: "a@b.c" })).toBe(true);

    const hours = {
      timezone: "America/Los_Angeles",
      summary: "",
      entries: [{ days: "Mon-Fri", open: "9", close: "5", notes: "" }],
    };
    expect(
      semanticEqual(hours, {
        timezone: "America/Los_Angeles",
        entries: [{ days: "Mon-Fri", open: "9", close: "5" }],
      }),
    ).toBe(true);
  });
});

describe("prepareAnswerForSave", () => {
  it("prunes blank optional nested values for offerings and staff", () => {
    const offerings = fieldByKey("business.offerings")!;
    expect(prepareAnswerForSave(offerings, [{ name: "Tacos", notes: "" }])).toEqual({
      kind: "value",
      value: [{ name: "Tacos" }],
    });

    const staff = fieldByKey("business.public_staff")!;
    expect(
      prepareAnswerForSave(staff, [{ display_name: "Sam", role_title: "", bio: "" }]),
    ).toEqual({
      kind: "value",
      value: [{ display_name: "Sam" }],
    });
  });

  it("omits blank hours notes and blank rows without invalidating untouched blanks", () => {
    const hours = fieldByKey("business.hours")!;
    expect(
      prepareAnswerForSave(hours, {
        timezone: "",
        summary: "",
        entries: [
          { days: "", open: "", close: "", notes: "" },
          { days: "Mon-Fri", open: "9", close: "5", notes: "" },
        ],
      }),
    ).toEqual({
      kind: "value",
      value: {
        entries: [{ days: "Mon-Fri", open: "9", close: "5" }],
      },
    });

    expect(
      prepareAnswerForSave(hours, {
        timezone: "",
        summary: "",
        entries: [{ days: "", open: "", close: "", notes: "" }],
      }),
    ).toEqual({ kind: "omit" });
  });

  it("rejects partial structured rows missing required nested fields", () => {
    const offerings = fieldByKey("business.offerings")!;
    expect(
      prepareAnswerForSave(offerings, [{ name: "", notes: "Only notes" }]),
    ).toMatchObject({ kind: "error" });

    const hours = fieldByKey("business.hours")!;
    expect(
      prepareAnswerForSave(hours, {
        entries: [{ days: "", open: "9", close: "5", notes: "" }],
      }),
    ).toMatchObject({ kind: "error" });
  });

  it("prunes blank contact properties", () => {
    const contact = fieldByKey("business.public_contact")!;
    expect(
      prepareAnswerForSave(contact, {
        phone: "555-0100",
        email: "",
        website: "  ",
        other: "",
      }),
    ).toEqual({
      kind: "value",
      value: { phone: "555-0100" },
    });
  });
});
