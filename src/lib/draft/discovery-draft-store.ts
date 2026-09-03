import { DRAFT_STORAGE_KEY, parseStoredDraft } from "./schema";
import type { PreAccountDraft } from "./schema";
import {
  loadOrCreateDraft,
  subscribePreAccountDraft,
} from "./storage";

let discoveryDraftInitialized = false;

export function resetDiscoveryDraftStoreForTests(): void {
  discoveryDraftInitialized = false;
}

export function subscribeDiscoveryDraft(onStoreChange: () => void): () => void {
  const unsubscribe = subscribePreAccountDraft(onStoreChange);

  if (typeof window !== "undefined" && !discoveryDraftInitialized) {
    discoveryDraftInitialized = true;
    loadOrCreateDraft();
    queueMicrotask(onStoreChange);
  }

  return unsubscribe;
}

export function getDiscoveryDraftRawSnapshot(): string | null {
  if (typeof window === "undefined" || !discoveryDraftInitialized) {
    return null;
  }

  return window.localStorage.getItem(DRAFT_STORAGE_KEY);
}

export function parseDiscoveryDraftRaw(raw: string | null): PreAccountDraft | null {
  if (!raw) {
    return null;
  }

  try {
    return parseStoredDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}
