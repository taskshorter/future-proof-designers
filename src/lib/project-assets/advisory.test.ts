import { describe, expect, it } from "vitest";

import { advisoryCheckSelectedFile } from "./advisory";

describe("advisoryCheckSelectedFile", () => {
  it("rejects unsupported types", () => {
    const file = new File(["x"], "evil.svg", { type: "image/svg+xml" });
    const result = advisoryCheckSelectedFile(file);
    expect(result.ok).toBe(false);
  });

  it("rejects oversized jpeg", () => {
    const file = new File([new Uint8Array(26 * 1024 * 1024)], "big.jpg", {
      type: "image/jpeg",
    });
    const result = advisoryCheckSelectedFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/25 MB/i);
  });

  it("accepts a small png", () => {
    const file = new File(["png"], "ok.png", { type: "image/png" });
    expect(advisoryCheckSelectedFile(file)).toEqual({ ok: true });
  });
});
