import { describe, expect, it } from "vitest";

import {
  attentionMessage,
  customerAttentionMessages,
  moduleKeyLabel,
  packageRationaleMessage,
  requiredFunctionalityLabel,
  requiredFunctionalityLabels,
} from "./labels";
import { fingerprintWebsitePlanRevision } from "./revision-fingerprint";

describe("website plan customer-safe labels", () => {
  it("never exposes raw package rationale rule ids", () => {
    expect(
      packageRationaleMessage("ESSENTIAL", "ESSENTIAL:default_marketing_envelope"),
    ).toBe("Your current needs fit a focused marketing website.");
    expect(
      packageRationaleMessage("BUSINESS", "BUSINESS:module:booklocal"),
    ).toBe(
      "Your plan includes scheduling needs that fit our Business Website scope.",
    );
    expect(
      packageRationaleMessage("CUSTOM", "CUSTOM:goals.ecommerce_present"),
    ).toBe("Your ecommerce requirements need custom scoping.");
    expect(packageRationaleMessage(null, "INSUFFICIENT")).toBe(
      "We need a little more information before recommending a package.",
    );

    for (const raw of [
      "ESSENTIAL:default_marketing_envelope",
      "BUSINESS:module:booklocal",
      "CUSTOM:goals.ecommerce_present",
      "INSUFFICIENT",
    ]) {
      const message = packageRationaleMessage(
        raw.startsWith("ESSENTIAL")
          ? "ESSENTIAL"
          : raw.startsWith("BUSINESS")
            ? "BUSINESS"
            : raw.startsWith("CUSTOM")
              ? "CUSTOM"
              : null,
        raw,
      );
      expect(message).not.toContain(raw);
      expect(message).not.toMatch(/ESSENTIAL:|BUSINESS:|CUSTOM:/);
    }
  });

  it("maps functionality tokens to readable labels and dedupes", () => {
    expect(requiredFunctionalityLabel("contact_form")).toBe("Contact form");
    expect(requiredFunctionalityLabel("contact")).toBe("Contact form");
    expect(requiredFunctionalityLabel("map")).toBe("Location map");
    expect(requiredFunctionalityLabel("unknown_future_token")).toBe(
      "Additional website functionality",
    );
    expect(
      requiredFunctionalityLabels([
        "contact_form",
        "contact",
        "seo",
        "basic_seo",
      ]),
    ).toEqual(["Contact form", "Search-engine basics"]);
  });

  it("dedupes attention flags and never shows raw codes", () => {
    const messages = customerAttentionMessages(
      ["MISSING_CRITICAL_FIELDS"],
      ["MISSING_CRITICAL_FIELDS"],
    );
    expect(messages).toEqual([
      "Some required business or goals information is still missing.",
    ]);
    expect(messages.join(" ")).not.toContain("MISSING_CRITICAL_FIELDS");

    const owner = customerAttentionMessages(
      ["OWNER_ATTENTION_INSUFFICIENT_CLASSIFICATION"],
      ["OWNER_ATTENTION_INSUFFICIENT_CLASSIFICATION"],
    );
    expect(owner).toEqual([
      "Some requested capabilities need more clarity before a package can be confirmed.",
    ]);
    expect(owner.join(" ")).not.toContain(
      "OWNER_ATTENTION_INSUFFICIENT_CLASSIFICATION",
    );
    expect(attentionMessage("MISSING_CRITICAL_FIELDS")).not.toBe(
      "MISSING_CRITICAL_FIELDS",
    );
  });

  it("does not expose unknown module keys", () => {
    expect(moduleKeyLabel("booklocal")).toBe("BookLocal scheduling");
    expect(moduleKeyLabel("future_internal_module")).toBe("Website module");
    expect(moduleKeyLabel("future_internal_module")).not.toBe(
      "future_internal_module",
    );
  });
});

describe("revision fingerprint", () => {
  it("is stable for equivalent payloads and distinct for changed intents", () => {
    expect(fingerprintWebsitePlanRevision({})).toBe(
      fingerprintWebsitePlanRevision({}),
    );
    expect(
      fingerprintWebsitePlanRevision({ addPages: [{ title: "Menu" }] }),
    ).toBe(
      fingerprintWebsitePlanRevision({ addPages: [{ title: "Menu" }] }),
    );
    expect(
      fingerprintWebsitePlanRevision({ addPages: [{ title: "Menu" }] }),
    ).not.toBe(
      fingerprintWebsitePlanRevision({ addPages: [{ title: "Catering" }] }),
    );
    expect(
      fingerprintWebsitePlanRevision({ addPages: [{ title: "Menu" }] }),
    ).not.toBe(
      fingerprintWebsitePlanRevision({
        moduleIntents: [{ moduleKey: "booklocal", intent: "DECLINE" }],
      }),
    );
  });
});
