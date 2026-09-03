import { describe, expect, it, beforeEach } from "vitest";

import {
  getDiscoveryDraftRawSnapshot,
  parseDiscoveryDraftRaw,
  resetDiscoveryDraftStoreForTests,
  subscribeDiscoveryDraft,
} from "./discovery-draft-store";
import { createDraft } from "./schema";
import { DRAFT_STORAGE_KEY } from "./schema";
import {
  clearPreAccountDraft,
  readPreAccountDraft,
  writePreAccountDraft,
} from "./storage";

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

async function flushMicrotasks(): Promise<void> {
  await new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });
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
    const unsubscribe = subscribeDiscoveryDraft(() => {
      changes.push(1);
    });

    await flushMicrotasks();

    const raw = getDiscoveryDraftRawSnapshot();
    expect(parseDiscoveryDraftRaw(raw)?.operationId).toBe(existing.operationId);
    expect(JSON.parse(storage.getItem(DRAFT_STORAGE_KEY)!).operationId).toBe(
      existing.operationId,
    );
    expect(changes.length).toBeGreaterThan(0);

    unsubscribe();
  });

  it("does not rotate operationId when a second subscriber joins the same mount", async () => {
    const storage = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });

    const first = subscribeDiscoveryDraft(() => {});
    await flushMicrotasks();
    const operationIdA = readPreAccountDraft(storage)!.operationId;

    const second = subscribeDiscoveryDraft(() => {});
    await flushMicrotasks();

    expect(readPreAccountDraft(storage)!.operationId).toBe(operationIdA);

    second();
    first();
  });
});

describe("discovery draft re-entry", () => {
  beforeEach(() => {
    resetDiscoveryDraftStoreForTests();
  });

  it("creates a new draft after prior draft consumption without module reload", async () => {
    const storage = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });

    const unsubscribeFirst = subscribeDiscoveryDraft(() => {});
    await flushMicrotasks();

    const operationIdA = readPreAccountDraft(storage)!.operationId;
    expect(operationIdA).toBeTruthy();

    clearPreAccountDraft(storage);
    expect(readPreAccountDraft(storage)).toBeNull();

    unsubscribeFirst();

    const unsubscribeSecond = subscribeDiscoveryDraft(() => {});
    await flushMicrotasks();

    const operationIdB = readPreAccountDraft(storage)!.operationId;
    expect(operationIdB).toBeTruthy();
    expect(operationIdB).not.toBe(operationIdA);
    expect(getDiscoveryDraftRawSnapshot()).not.toBeNull();
    expect(parseDiscoveryDraftRaw(getDiscoveryDraftRawSnapshot())).not.toBeNull();

    unsubscribeSecond();
  });
});
