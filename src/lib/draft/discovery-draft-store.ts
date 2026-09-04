import { DRAFT_STORAGE_KEY, parseStoredDraft } from "./schema";
import type { PreAccountDraft } from "./schema";
import {
  loadOrCreateDraft,
  readPreAccountDraft,
  subscribePreAccountDraft,
} from "./storage";

let activeDiscoverySubscribers = 0;
let bootstrappedForCurrentMount = false;

export function resetDiscoveryDraftStoreForTests(): void {
  activeDiscoverySubscribers = 0;
  bootstrappedForCurrentMount = false;
}

function bootstrapDiscoveryDraftIfNeeded(onStoreChange: () => void): void {
  if (typeof window === "undefined" || bootstrappedForCurrentMount) {
    return;
  }

  bootstrappedForCurrentMount = true;

  if (!readPreAccountDraft()) {
    loadOrCreateDraft();
  }

  queueMicrotask(onStoreChange);
}

export function subscribeDiscoveryDraft(onStoreChange: () => void): () => void {
  const unsubscribeStorage = subscribePreAccountDraft(onStoreChange);

  activeDiscoverySubscribers += 1;
  bootstrapDiscoveryDraftIfNeeded(onStoreChange);

  return () => {
    unsubscribeStorage();
    activeDiscoverySubscribers = Math.max(0, activeDiscoverySubscribers - 1);

    if (activeDiscoverySubscribers === 0) {
      bootstrappedForCurrentMount = false;
    }
  };
}

export function getDiscoveryDraftRawSnapshot(): string | null {
  if (typeof window === "undefined" || !bootstrappedForCurrentMount) {
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
