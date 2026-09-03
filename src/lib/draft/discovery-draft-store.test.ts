import { describe, expect, it, beforeEach } from "vitest";

import {
  getDiscoveryDraftRawSnapshot,
  parseDiscoveryDraftRaw,
  resetDiscoveryDraftStoreForTests,
  subscribeDiscoveryDraft,
} from "./discovery-draft-store";
import { createDraft } from "./schema";
import { DRAFT_STORAGE_KEY } from "./schema";
import { writePreAccountDraft } from "./storage";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("discovery draft store", () => {
  beforeEach(() => {
    resetDiscoveryDraftStoreForTests();
  });

  it("returns null before browser initialization for hydration-safe server/first-client render", () => {
    expect(getDiscoveryDraftRawSnapshot()).toBeNull();
  });

  it("initializes exactly one draft after subscribe and reuses existing drafts", async () => {
    const storage = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });

    const existing = createDraft();
    writePreAccountDraft(existing, storage);

    const changes: number[] = [];
    subscribeDiscoveryDraft(() => {
      changes.push(1);
    });

    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });

    const raw = getDiscoveryDraftRawSnapshot();
    expect(parseDiscoveryDraftRaw(raw)?.operationId).toBe(existing.operationId);
    expect(JSON.parse(storage.getItem(DRAFT_STORAGE_KEY)!).operationId).toBe(
      existing.operationId,
    );
    expect(changes.length).toBeGreaterThan(0);
  });
});
