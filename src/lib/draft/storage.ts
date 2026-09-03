import {
  DRAFT_STORAGE_KEY,
  createDraft,
  parseStoredDraft,
  type PreAccountDraft,
  type PreAccountDraftAnswers,
} from "./schema";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const draftListeners = new Set<() => void>();

export function subscribePreAccountDraft(listener: () => void): () => void {
  draftListeners.add(listener);
  return () => {
    draftListeners.delete(listener);
  };
}

function notifyDraftListeners(): void {
  draftListeners.forEach((listener) => listener());
}

function getStorage(storage?: StorageLike): StorageLike | null {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function readPreAccountDraft(storage?: StorageLike): PreAccountDraft | null {
  const target = getStorage(storage);
  if (!target) {
    return null;
  }

  const raw = target.getItem(DRAFT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return parseStoredDraft(JSON.parse(raw));
  } catch {
    target.removeItem(DRAFT_STORAGE_KEY);
    return null;
  }
}

export function writePreAccountDraft(
  draft: PreAccountDraft,
  storage?: StorageLike,
): PreAccountDraft {
  const target = getStorage(storage);
  if (!target) {
    return draft;
  }

  target.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  notifyDraftListeners();
  return draft;
}

export function clearPreAccountDraft(storage?: StorageLike): void {
  const target = getStorage(storage);
  target?.removeItem(DRAFT_STORAGE_KEY);
  notifyDraftListeners();
}

export function loadOrCreateDraft(storage?: StorageLike): PreAccountDraft {
  return readPreAccountDraft(storage) ?? writePreAccountDraft(createDraft(), storage);
}

export function saveDraftAnswers(
  updates: Partial<PreAccountDraftAnswers>,
  storage?: StorageLike,
): PreAccountDraft {
  const current = loadOrCreateDraft(storage);
  const next = {
    ...current,
    answers: {
      ...current.answers,
      ...updates,
    },
  };

  return writePreAccountDraft(next, storage);
}
