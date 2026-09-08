import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../../..");

describe("B4-P1 deposit payment security boundary", () => {
  it("does not add Stripe SDK dependency", () => {
    const pkg = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };
    expect(Object.keys(all).some((k) => /stripe/i.test(k))).toBe(false);
  });

  it("does not introduce Stripe secret env schema fields", () => {
    const schema = readFileSync(join(root, "src/lib/env/schema.ts"), "utf8");
    expect(schema).not.toMatch(/STRIPE_/i);
  });

  it("payment panel has no card form fields", () => {
    const panel = readFileSync(
      join(root, "src/components/payment/DepositPaymentPanel.tsx"),
      "utf8",
    );
    expect(panel).not.toMatch(/cardNumber|card-number|cvv|cvc|client_secret/i);
    expect(panel).not.toMatch(/<input[^>]+type=["'](?:tel|password)["']/i);
  });

  it("return routes do not treat attempt query as payment authority", () => {
    const success = readFileSync(
      join(root, "app/projects/[projectId]/deposit/return/page.tsx"),
      "utf8",
    );
    const cancel = readFileSync(
      join(root, "app/projects/[projectId]/deposit/cancel/page.tsx"),
      "utf8",
    );
    expect(success).toMatch(/NON-AUTHORITATIVE|never grant authority/i);
    expect(success).toMatch(/loadDepositPaymentForReturn/);
    expect(success).not.toMatch(/paymentState:\s*["']PAID["']/);
    expect(cancel).toMatch(/loadDepositPaymentForReturn/);
    expect(cancel).not.toMatch(/Payment cancelled/);
  });

  it("exact /projects/.../deposit return and cancel routes exist", () => {
    const returnPage = join(
      root,
      "app/projects/[projectId]/deposit/return/page.tsx",
    );
    const cancelPage = join(
      root,
      "app/projects/[projectId]/deposit/cancel/page.tsx",
    );
    expect(() => readFileSync(returnPage, "utf8")).not.toThrow();
    expect(() => readFileSync(cancelPage, "utf8")).not.toThrow();
  });
});
