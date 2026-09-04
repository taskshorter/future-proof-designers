import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PortalResumePanel } from "./PortalResumePanel";
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

describe("PortalResumePanel draft read behavior", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not create a draft when rendering with zero projects", async () => {
    const storage = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });

    render(<PortalResumePanel projects={[]} />);

    expect(screen.getByText("Start website process")).toBeInTheDocument();
    expect(storage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

    await waitFor(() => {
      expect(screen.getByText("Start website process")).toBeInTheDocument();
    });
    expect(storage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("discovers an existing complete draft after hydration", async () => {
    const storage = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });

    const draft = createDraft();
    draft.answers = {
      hasExistingWebsite: false,
      existingWebsiteUrl: null,
      businessDescription: "Neighborhood bakery",
      thirdAnswer: "More online orders",
    };
    writePreAccountDraft(draft, storage);

    render(<PortalResumePanel projects={[]} />);

    await waitFor(() => {
      expect(screen.getByText("Continue saved request")).toBeInTheDocument();
    });
  });
});
