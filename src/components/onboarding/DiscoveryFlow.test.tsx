import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
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

function seedCompleteDraft(storage: Storage) {
  const draft = createDraft();
  writePreAccountDraft(
    {
      ...draft,
      answers: {
        hasExistingWebsite: false,
        existingWebsiteUrl: null,
        businessDescription: "Neighborhood bakery",
        thirdAnswer: "Need clearer hours and online ordering",
      },
    },
    storage,
  );
}

async function openReview() {
  await waitFor(() => {
    expect(screen.getByText("Do you currently have a website?")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "No" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Review" }));

  await waitFor(() => {
    expect(screen.getByText("Review your answers")).toBeInTheDocument();
  });
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

    render(<DiscoveryFlow isSignedIn={false} />);

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

    render(<DiscoveryFlow isSignedIn={false} />);

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

    render(<DiscoveryFlow isSignedIn={false} />);

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

    const first = render(<DiscoveryFlow isSignedIn={false} />);

    await waitFor(() => {
      expect(screen.getByText("Do you currently have a website?")).toBeInTheDocument();
    });

    const operationIdA = JSON.parse(storage.getItem(DRAFT_STORAGE_KEY)!).operationId as string;
    storage.removeItem(DRAFT_STORAGE_KEY);
    first.unmount();

    render(<DiscoveryFlow isSignedIn={false} />);

    await waitFor(() => {
      expect(screen.getByText("Do you currently have a website?")).toBeInTheDocument();
    });

    const operationIdB = JSON.parse(storage.getItem(DRAFT_STORAGE_KEY)!).operationId as string;
    expect(operationIdB).not.toBe(operationIdA);
  });

  it("marks the selected Yes/No choice as active", async () => {
    const storage = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });

    render(<DiscoveryFlow isSignedIn={false} />);

    await waitFor(() => {
      expect(screen.getByText("Do you currently have a website?")).toBeInTheDocument();
    });

    const yes = screen.getByRole("button", { name: "Yes" });
    const no = screen.getByRole("button", { name: "No" });

    fireEvent.click(yes);
    expect(yes).toHaveClass("active");
    expect(yes).toHaveAttribute("aria-pressed", "true");
    expect(no).not.toHaveClass("active");
    expect(no).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(no);
    expect(no).toHaveClass("active");
    expect(no).toHaveAttribute("aria-pressed", "true");
    expect(yes).not.toHaveClass("active");
  });
});

describe("DiscoveryFlow review auth actions", () => {
  beforeEach(() => {
    resetDiscoveryDraftStoreForTests();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows Create account and Sign in when signed out", async () => {
    const storage = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
    seedCompleteDraft(storage);

    render(<DiscoveryFlow isSignedIn={false} />);
    await openReview();

    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/sign-up?next=/start",
    );
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in?next=/start",
    );
    expect(screen.queryByRole("button", { name: "Save project" })).not.toBeInTheDocument();
  });

  it("shows Save project only when signed in", async () => {
    const storage = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
    seedCompleteDraft(storage);

    render(<DiscoveryFlow isSignedIn={true} />);
    await openReview();

    expect(screen.getByRole("button", { name: "Save project" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create account" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });
});
