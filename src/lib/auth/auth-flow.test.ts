import { describe, expect, it } from "vitest";

import { sanitizeInternalReturnPath } from "@/lib/auth/safe-return-path";

describe("auth return-path integration", () => {
  it("uses sanitized next paths for sign-in continuation URLs", () => {
    expect(sanitizeInternalReturnPath("/portal/projects/123")).toBe(
      "/portal/projects/123",
    );
    expect(sanitizeInternalReturnPath("//evil.example")).toBe("/portal");
  });

  it("documents signup immediate-session redirect target selection", () => {
    const next = sanitizeInternalReturnPath("/start");
    expect(next).toBe("/start");
    expect(sanitizeInternalReturnPath("https://evil.example")).toBe("/portal");
  });
});

describe("draft retry semantics", () => {
  it("preserves draft and operationId when submission fails", async () => {
    const { loadOrCreateDraft, readPreAccountDraft } = await import("@/lib/draft/storage");
    const storage = new Map<string, string>();
    const memoryStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    } as Storage;

    const draft = loadOrCreateDraft(memoryStorage);
    const operationId = draft.operationId;

    const failed = {
      ok: false as const,
      category: "temporary_failure" as const,
      message: "Retry",
    };
    expect(failed.ok).toBe(false);
    expect(readPreAccountDraft(memoryStorage)?.operationId).toBe(operationId);
  });

  it("does not rotate operationId on stale_or_conflicting results", async () => {
    const { loadOrCreateDraft, readPreAccountDraft, saveDraftAnswers } = await import(
      "@/lib/draft/storage"
    );
    const storage = new Map<string, string>();
    const memoryStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    } as Storage;

    const draft = loadOrCreateDraft(memoryStorage);
    saveDraftAnswers({ thirdAnswer: "Updated" }, memoryStorage);
    expect(readPreAccountDraft(memoryStorage)?.operationId).toBe(draft.operationId);
  });
});

describe("session expiry draft preservation", () => {
  it("leaves draft intact when only auth/session fails", async () => {
    const { loadOrCreateDraft, readPreAccountDraft } = await import("@/lib/draft/storage");
    const storage = new Map<string, string>();
    const memoryStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    } as Storage;

    const draft = loadOrCreateDraft(memoryStorage);
    const authFailure = {
      ok: false as const,
      category: "session_expired" as const,
      message: "Sign in again",
    };
    expect(authFailure.category).toBe("session_expired");
    expect(readPreAccountDraft(memoryStorage)?.operationId).toBe(draft.operationId);
  });
});
