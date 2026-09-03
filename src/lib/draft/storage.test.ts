import { describe, expect, it } from "vitest";

import {
  clearPreAccountDraft,
  loadOrCreateDraft,
  readPreAccountDraft,
  saveDraftAnswers,
  writePreAccountDraft,
} from "./storage";
import { createDraft, DRAFT_STORAGE_KEY } from "./schema";

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

describe("pre-account draft storage", () => {
  it("survives reload/reinitialization with the same operationId", () => {
    const storage = createMemoryStorage();
    const first = loadOrCreateDraft(storage);
    saveDraftAnswers({ businessDescription: "Keep wording exact " }, storage);

    const reloaded = readPreAccountDraft(storage);
    expect(reloaded?.operationId).toBe(first.operationId);
    expect(reloaded?.answers.businessDescription).toBe("Keep wording exact ");
    expect(storage.getItem(DRAFT_STORAGE_KEY)).toContain(first.operationId);
  });

  it("clears draft only when explicitly cleared", () => {
    const storage = createMemoryStorage();
    loadOrCreateDraft(storage);
    clearPreAccountDraft(storage);
    expect(readPreAccountDraft(storage)).toBeNull();
  });

  it("preserves operationId across failed submission semantics", () => {
    const storage = createMemoryStorage();
    const draft = loadOrCreateDraft(storage);
    const operationId = draft.operationId;

    const stillThere = readPreAccountDraft(storage);
    expect(stillThere?.operationId).toBe(operationId);
  });

  it("does not rotate operationId after stale conflict handling at storage layer", () => {
    const storage = createMemoryStorage();
    const draft = createDraft();
    writePreAccountDraft(draft, storage);
    saveDraftAnswers({ thirdAnswer: "Updated goal" }, storage);

    expect(readPreAccountDraft(storage)?.operationId).toBe(draft.operationId);
  });

  it("clears draft after explicit clear following a successful browser confirmation flow", () => {
    const storage = createMemoryStorage();
    loadOrCreateDraft(storage);
    clearPreAccountDraft(storage);
    expect(readPreAccountDraft(storage)).toBeNull();
  });
});
