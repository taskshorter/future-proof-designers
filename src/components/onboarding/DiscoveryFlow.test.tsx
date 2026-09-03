import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DiscoveryFlow } from "./DiscoveryFlow";
import { resetDiscoveryDraftStoreForTests } from "@/lib/draft/discovery-draft-store";
import { createDraft } from "@/lib/draft/schema";
import { DRAFT_STORAGE_KEY } from "@/lib/draft/schema";
import { writePreAccountDraft } from "@/lib/draft/storage";

vi.mock("@/lib/projects/actions", () => ({
  submitProjectStartAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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

describe("DiscoveryFlow hydration", () => {
  beforeEach(() => {
    resetDiscoveryDraftStoreForTests();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the discovery flow after browser initialization", async () => {
    const storage = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });

    render(<DiscoveryFlow />);

    await waitFor(() => {
      expect(screen.getByText("Do you currently have a website?")).toBeInTheDocument();
    });
  });

  it("reuses an existing draft operationId after initialization", async () => {
    const storage = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });

    const existing = createDraft();
    writePreAccountDraft(existing, storage);

    render(<DiscoveryFlow />);

    await waitFor(() => {
      expect(screen.getByText("Do you currently have a website?")).toBeInTheDocument();
    });

    expect(JSON.parse(storage.getItem(DRAFT_STORAGE_KEY)!).operationId).toBe(
      existing.operationId,
    );
  });

  it("creates one operationId when no draft existed before initialization", async () => {
    const storage = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });

    render(<DiscoveryFlow />);

    await waitFor(() => {
      expect(screen.getByText("Do you currently have a website?")).toBeInTheDocument();
    });

    const raw = storage.getItem(DRAFT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).operationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("creates a fresh draft after remount when the prior draft was consumed", async () => {
    const storage = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });

    const first = render(<DiscoveryFlow />);

    await waitFor(() => {
      expect(screen.getByText("Do you currently have a website?")).toBeInTheDocument();
    });

    const operationIdA = JSON.parse(storage.getItem(DRAFT_STORAGE_KEY)!).operationId as string;
    storage.removeItem(DRAFT_STORAGE_KEY);
    first.unmount();

    render(<DiscoveryFlow />);

    await waitFor(() => {
      expect(screen.getByText("Do you currently have a website?")).toBeInTheDocument();
    });

    const operationIdB = JSON.parse(storage.getItem(DRAFT_STORAGE_KEY)!).operationId as string;
    expect(operationIdB).not.toBe(operationIdA);
  });
});
