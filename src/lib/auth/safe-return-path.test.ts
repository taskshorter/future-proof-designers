import { describe, expect, it } from "vitest";

import {
  DEFAULT_RETURN_PATH,
  buildSignInPath,
  sanitizeInternalReturnPath,
} from "./safe-return-path";

describe("sanitizeInternalReturnPath", () => {
  it("accepts ordinary internal paths and query strings", () => {
    expect(sanitizeInternalReturnPath("/portal")).toBe("/portal");
    expect(sanitizeInternalReturnPath("/start")).toBe("/start");
    expect(sanitizeInternalReturnPath("/portal/projects/abc")).toBe(
      "/portal/projects/abc",
    );
    expect(sanitizeInternalReturnPath("/start?step=review")).toBe("/start?step=review");
  });

  it("rejects protocol-relative, absolute, backslash, and malformed values", () => {
    expect(sanitizeInternalReturnPath("//evil.example")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeInternalReturnPath("https://evil.example")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeInternalReturnPath("http://evil.example/portal")).toBe(
      DEFAULT_RETURN_PATH,
    );
    expect(sanitizeInternalReturnPath("/portal\\@evil.example")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeInternalReturnPath("")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeInternalReturnPath("portal")).toBe(DEFAULT_RETURN_PATH);
    expect(sanitizeInternalReturnPath(null)).toBe(DEFAULT_RETURN_PATH);
  });

  it("rejects normalized path traversal and protocol-relative bypass vectors", () => {
    for (const value of ["/a/..//evil.example", "/%2e//evil.example"]) {
      const sanitized = sanitizeInternalReturnPath(value);
      expect(sanitized.startsWith("//")).toBe(false);
      expect(sanitized).toBe(DEFAULT_RETURN_PATH);
    }
  });

  it("never returns a protocol-relative path", () => {
    const vectors = [
      "//evil.example",
      "/a/..//evil.example",
      "/%2e//evil.example",
      "/portal/../../../evil.example",
    ];

    for (const value of vectors) {
      const sanitized = sanitizeInternalReturnPath(value);
      expect(sanitized.startsWith("//")).toBe(false);
    }
  });

  it("builds a safe sign-in continuation path", () => {
    expect(buildSignInPath("/portal/projects/123")).toBe(
      "/sign-in?next=%2Fportal%2Fprojects%2F123",
    );
    expect(buildSignInPath("//evil.example")).toBe(
      `/sign-in?next=${encodeURIComponent(DEFAULT_RETURN_PATH)}`,
    );
    expect(buildSignInPath("/a/..//evil.example")).toBe(
      `/sign-in?next=${encodeURIComponent(DEFAULT_RETURN_PATH)}`,
    );
  });
});
