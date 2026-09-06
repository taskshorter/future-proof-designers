import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectAsset } from "@/lib/factory/contract";

const refreshProjectAssetsAction = vi.fn();
const createProjectAssetUploadIntentAction = vi.fn();
const completeProjectAssetUploadAction = vi.fn();
const createProjectAssetReadIntentAction = vi.fn();
const removeProjectAssetAction = vi.fn();
const updateProjectAssetRightsAction = vi.fn();
const uploadFileToSignedCapability = vi.fn();

vi.mock("@/lib/onboarding/actions", () => ({
  refreshProjectAssetsAction: (...args: unknown[]) =>
    refreshProjectAssetsAction(...args),
  createProjectAssetUploadIntentAction: (...args: unknown[]) =>
    createProjectAssetUploadIntentAction(...args),
  completeProjectAssetUploadAction: (...args: unknown[]) =>
    completeProjectAssetUploadAction(...args),
  createProjectAssetReadIntentAction: (...args: unknown[]) =>
    createProjectAssetReadIntentAction(...args),
  removeProjectAssetAction: (...args: unknown[]) =>
    removeProjectAssetAction(...args),
  updateProjectAssetRightsAction: (...args: unknown[]) =>
    updateProjectAssetRightsAction(...args),
}));

vi.mock("@/lib/project-assets/browser-upload", () => ({
  uploadFileToSignedCapability: (...args: unknown[]) =>
    uploadFileToSignedCapability(...args),
}));

import { ProjectAssetsPanel } from "./ProjectAssetsPanel";

const projectId = "00000000-0000-4000-8000-000000000013";

function asset(overrides: Partial<ProjectAsset> = {}): ProjectAsset {
  return {
    id: "00000000-0000-4000-8000-0000000000a1",
    origin: "CUSTOMER_UPLOAD",
    assetKind: "IMAGE",
    lifecycleState: "AVAILABLE",
    validationState: "VALID",
    rightsState: "CUSTOMER_PROJECT_USE_AUTHORIZED",
    originalFilename: "logo.png",
    declaredContentType: "image/png",
    declaredByteSize: 1024,
    validatedContentType: "image/png",
    validatedByteSize: 1024,
    contentHash: null,
    version: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    availableAt: "2026-01-01T00:00:00.000Z",
    failedAt: null,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("ProjectAssetsPanel", () => {
  const onAssetsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    let n = 0;
    vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
      n += 1;
      return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows empty state", () => {
    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [] }}
        onAssetsChange={onAssetsChange}
      />,
    );
    expect(screen.getByText(/No project files yet/i)).toBeInTheDocument();
  });

  it("shows unavailable nonblocking state", () => {
    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{
          status: "unavailable",
          category: "temporary_failure",
          message: "Temporarily unavailable",
        }}
        onAssetsChange={onAssetsChange}
      />,
    );
    expect(screen.getByText(/Temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/keep answering onboarding/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry file list/i })).toBeInTheDocument();
  });

  it("renders lifecycle rows and customer-upload has no rights checkbox", () => {
    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{
          status: "ready",
          assets: [
            asset({ originalFilename: "ready.png" }),
            asset({
              id: "00000000-0000-4000-8000-0000000000a2",
              originalFilename: "pending.png",
              lifecycleState: "PENDING_UPLOAD",
              validationState: "UNVALIDATED",
              availableAt: null,
            }),
            asset({
              id: "00000000-0000-4000-8000-0000000000a3",
              originalFilename: "failed.png",
              lifecycleState: "FAILED",
              validationState: "INVALID",
            }),
            asset({
              id: "00000000-0000-4000-8000-0000000000a4",
              originalFilename: "removing.png",
              lifecycleState: "REMOVAL_PENDING",
            }),
            asset({
              id: "00000000-0000-4000-8000-0000000000a5",
              originalFilename: "gone.png",
              lifecycleState: "REMOVED",
            }),
          ],
        }}
        onAssetsChange={onAssetsChange}
      />,
    );

    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Finishing upload")).toBeInTheDocument();
    expect(screen.getByText("Couldn’t use this file")).toBeInTheDocument();
    expect(screen.getByText("Removing")).toBeInTheDocument();
    expect(screen.getByText("Removed")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Retry finishing upload/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Use for this project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("rejects unsupported advisory selection before upload-intent", async () => {
    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [] }}
        onAssetsChange={onAssetsChange}
      />,
    );
    const input = screen.getByLabelText(/Add files/i);
    const file = new File(["x"], "bad.svg", { type: "image/svg+xml" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/isn.t supported/i);
    expect(createProjectAssetUploadIntentAction).not.toHaveBeenCalled();
  });

  it("uploads happily and reloads authoritative assets after complete", async () => {
    const pending = asset({
      lifecycleState: "PENDING_UPLOAD",
      validationState: "UNVALIDATED",
      availableAt: null,
    });
    const ready = asset({ lifecycleState: "AVAILABLE", validationState: "VALID", version: 2 });

    createProjectAssetUploadIntentAction.mockResolvedValue({
      ok: true,
      asset: pending,
      upload: {
        provider: "SUPABASE",
        bucket: "fp-project-assets",
        path: "projects/p/a/obj",
        token: "tok",
        expiresAt: null,
      },
      replayed: false,
    });
    uploadFileToSignedCapability.mockResolvedValue({ ok: true });
    completeProjectAssetUploadAction.mockResolvedValue({
      ok: true,
      assets: { status: "ready", assets: [ready] },
    });

    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [] }}
        onAssetsChange={onAssetsChange}
      />,
    );

    const file = new File(["png"], "logo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/Add files/i), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(createProjectAssetUploadIntentAction).toHaveBeenCalled();
    });
    expect(createProjectAssetUploadIntentAction.mock.calls[0]![0]).toMatchObject({
      originalFilename: "logo.png",
      contentType: "image/png",
      byteSize: file.size,
    });
    expect(createProjectAssetUploadIntentAction.mock.calls[0]![0]).not.toHaveProperty(
      "file",
    );

    await waitFor(() => {
      expect(uploadFileToSignedCapability).toHaveBeenCalledWith(
        expect.objectContaining({
          file,
          upload: expect.objectContaining({
            bucket: "fp-project-assets",
            path: "projects/p/a/obj",
            token: "tok",
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(completeProjectAssetUploadAction).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(onAssetsChange).toHaveBeenCalledWith({
        status: "ready",
        assets: [ready],
      });
    });
  });

  it("does not complete after direct upload failure", async () => {
    createProjectAssetUploadIntentAction.mockResolvedValue({
      ok: true,
      asset: asset({ lifecycleState: "PENDING_UPLOAD", validationState: "UNVALIDATED" }),
      upload: {
        provider: "SUPABASE",
        bucket: "b",
        path: "p",
        token: "t",
        expiresAt: null,
      },
      replayed: false,
    });
    uploadFileToSignedCapability.mockResolvedValue({
      ok: false,
      message: "Upload to storage failed. Please try again.",
    });

    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [] }}
        onAssetsChange={onAssetsChange}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Add files/i), {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });

    expect(await screen.findByText(/Upload to storage failed/i)).toBeInTheDocument();
    expect(completeProjectAssetUploadAction).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Retry upload/i })).toBeInTheDocument();
  });

  it("retries complete-only after temporary complete failure without re-uploading", async () => {
    const pending = asset({
      lifecycleState: "PENDING_UPLOAD",
      validationState: "UNVALIDATED",
      availableAt: null,
    });
    const ready = asset({
      lifecycleState: "AVAILABLE",
      validationState: "VALID",
      version: 2,
    });

    createProjectAssetUploadIntentAction.mockResolvedValue({
      ok: true,
      asset: pending,
      upload: {
        provider: "SUPABASE",
        bucket: "fp-project-assets",
        path: "projects/p/a/obj",
        token: "tok",
        expiresAt: null,
      },
      replayed: false,
    });
    uploadFileToSignedCapability.mockResolvedValue({ ok: true });
    completeProjectAssetUploadAction
      .mockResolvedValueOnce({
        ok: false,
        category: "temporary_failure",
        message: "Temporary complete failure",
      })
      .mockResolvedValueOnce({
        ok: true,
        assets: { status: "ready", assets: [ready] },
      });
    // Authoritative row still nonterminal → complete-only retry remains available.
    refreshProjectAssetsAction.mockResolvedValue({
      ok: true,
      assets: { status: "ready", assets: [pending] },
    });

    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [] }}
        onAssetsChange={onAssetsChange}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Add files/i), {
      target: { files: [new File(["png"], "logo.png", { type: "image/png" })] },
    });

    expect(await screen.findByRole("button", { name: /Retry upload/i })).toBeInTheDocument();
    expect(createProjectAssetUploadIntentAction).toHaveBeenCalledTimes(1);
    expect(uploadFileToSignedCapability).toHaveBeenCalledTimes(1);
    expect(completeProjectAssetUploadAction).toHaveBeenCalledTimes(1);
    expect(refreshProjectAssetsAction).toHaveBeenCalled();

    const firstComplete = completeProjectAssetUploadAction.mock.calls[0]![0];
    fireEvent.click(screen.getByRole("button", { name: /Retry upload/i }));

    await waitFor(() => {
      expect(completeProjectAssetUploadAction).toHaveBeenCalledTimes(2);
    });
    expect(createProjectAssetUploadIntentAction).toHaveBeenCalledTimes(1);
    expect(uploadFileToSignedCapability).toHaveBeenCalledTimes(1);

    const secondComplete = completeProjectAssetUploadAction.mock.calls[1]![0];
    expect(secondComplete).toEqual(firstComplete);
    expect(secondComplete).toMatchObject({
      assetId: pending.id,
      expectedVersion: pending.version,
      operationId: firstComplete.operationId,
      correlationId: firstComplete.correlationId,
    });
    await waitFor(() => {
      expect(onAssetsChange).toHaveBeenCalledWith({
        status: "ready",
        assets: [ready],
      });
    });
  });

  it("reuses SAME upload-intent IDs after intent temporary failure", async () => {
    const pending = asset({
      lifecycleState: "PENDING_UPLOAD",
      validationState: "UNVALIDATED",
      availableAt: null,
    });
    const ready = asset({ version: 2 });

    createProjectAssetUploadIntentAction
      .mockResolvedValueOnce({
        ok: false,
        category: "temporary_failure",
        message: "Intent down",
      })
      .mockResolvedValueOnce({
        ok: true,
        asset: pending,
        upload: {
          provider: "SUPABASE",
          bucket: "b",
          path: "p",
          token: "t2",
          expiresAt: null,
        },
        replayed: false,
      });
    uploadFileToSignedCapability.mockResolvedValue({ ok: true });
    completeProjectAssetUploadAction.mockResolvedValue({
      ok: true,
      assets: { status: "ready", assets: [ready] },
    });

    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [] }}
        onAssetsChange={onAssetsChange}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Add files/i), {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });

    expect(await screen.findByRole("button", { name: /Retry upload/i })).toBeInTheDocument();
    const firstIntent = createProjectAssetUploadIntentAction.mock.calls[0]![0];
    fireEvent.click(screen.getByRole("button", { name: /Retry upload/i }));

    await waitFor(() => {
      expect(createProjectAssetUploadIntentAction).toHaveBeenCalledTimes(2);
    });
    const secondIntent = createProjectAssetUploadIntentAction.mock.calls[1]![0];
    expect(secondIntent.operationId).toBe(firstIntent.operationId);
    expect(secondIntent.correlationId).toBe(firstIntent.correlationId);
    await waitFor(() => {
      expect(completeProjectAssetUploadAction).toHaveBeenCalled();
    });
  });

  it("replays SAME upload-intent identity after direct-upload failure", async () => {
    const pending = asset({
      lifecycleState: "PENDING_UPLOAD",
      validationState: "UNVALIDATED",
      availableAt: null,
    });
    const ready = asset({ version: 2 });

    createProjectAssetUploadIntentAction.mockResolvedValue({
      ok: true,
      asset: pending,
      upload: {
        provider: "SUPABASE",
        bucket: "b",
        path: "p",
        token: "fresh-token",
        expiresAt: null,
      },
      replayed: false,
    });
    uploadFileToSignedCapability
      .mockResolvedValueOnce({
        ok: false,
        message: "Upload to storage failed. Please try again.",
      })
      .mockResolvedValueOnce({ ok: true });
    completeProjectAssetUploadAction.mockResolvedValue({
      ok: true,
      assets: { status: "ready", assets: [ready] },
    });

    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [] }}
        onAssetsChange={onAssetsChange}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Add files/i), {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });

    expect(await screen.findByRole("button", { name: /Retry upload/i })).toBeInTheDocument();
    const firstIntent = createProjectAssetUploadIntentAction.mock.calls[0]![0];
    fireEvent.click(screen.getByRole("button", { name: /Retry upload/i }));

    await waitFor(() => {
      expect(createProjectAssetUploadIntentAction).toHaveBeenCalledTimes(2);
    });
    const secondIntent = createProjectAssetUploadIntentAction.mock.calls[1]![0];
    expect(secondIntent.operationId).toBe(firstIntent.operationId);
    expect(secondIntent.correlationId).toBe(firstIntent.correlationId);
    await waitFor(() => {
      expect(uploadFileToSignedCapability).toHaveBeenCalledTimes(2);
      expect(completeProjectAssetUploadAction).toHaveBeenCalledTimes(1);
    });
  });

  it("ambiguous upload only succeeds after Factory complete", async () => {
    const pending = asset({
      lifecycleState: "PENDING_UPLOAD",
      validationState: "UNVALIDATED",
      availableAt: null,
    });
    const ready = asset({ version: 2 });

    createProjectAssetUploadIntentAction.mockResolvedValue({
      ok: true,
      asset: pending,
      upload: {
        provider: "SUPABASE",
        bucket: "b",
        path: "p",
        token: "tok",
        expiresAt: null,
      },
      replayed: false,
    });
    uploadFileToSignedCapability.mockResolvedValue({
      ok: false,
      message: "Upload to storage failed. Please try again.",
    });
    completeProjectAssetUploadAction.mockResolvedValue({
      ok: true,
      assets: { status: "ready", assets: [ready] },
    });

    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [] }}
        onAssetsChange={onAssetsChange}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Add files/i), {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });

    expect(await screen.findByRole("button", { name: /Retry upload/i })).toBeInTheDocument();
    expect(completeProjectAssetUploadAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Retry upload/i }));

    await waitFor(() => {
      expect(uploadFileToSignedCapability).toHaveBeenCalledTimes(2);
      expect(completeProjectAssetUploadAction).toHaveBeenCalledTimes(1);
    });
    const completeArgs = completeProjectAssetUploadAction.mock.calls[0]![0];
    expect(completeArgs).toMatchObject({
      assetId: pending.id,
      expectedVersion: pending.version,
    });
    await waitFor(() => {
      expect(onAssetsChange).toHaveBeenCalledWith({
        status: "ready",
        assets: [ready],
      });
    });
    expect(screen.queryByRole("button", { name: /Retry upload/i })).not.toBeInTheDocument();
  });

  it("opens via read-intent on explicit action", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    createProjectAssetReadIntentAction.mockResolvedValue({
      ok: true,
      assetId: asset().id,
      read: { url: "https://signed.example/file", expiresAt: "2026-01-01T00:05:00.000Z" },
      replayed: false,
    });

    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [asset()] }}
        onAssetsChange={onAssetsChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    await waitFor(() => {
      expect(createProjectAssetReadIntentAction).toHaveBeenCalledWith(
        expect.objectContaining({ assetId: asset().id, projectId }),
      );
    });
    expect(openSpy).toHaveBeenCalledWith(
      "https://signed.example/file",
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });

  it("shows Open for AVAILABLE+VALID unconfirmed discovered assets only", () => {
    const { rerender } = render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{
          status: "ready",
          assets: [
            asset({
              origin: "PUBLICLY_DISCOVERED",
              rightsState: "REUSE_RIGHTS_UNCONFIRMED",
              validationState: "VALID",
              originalFilename: "ok.jpg",
            }),
          ],
        }}
        onAssetsChange={onAssetsChange}
      />,
    );
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();

    rerender(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{
          status: "ready",
          assets: [
            asset({
              origin: "PUBLICLY_DISCOVERED",
              rightsState: "REUSE_RIGHTS_UNCONFIRMED",
              validationState: "UNVALIDATED",
              originalFilename: "pending.jpg",
            }),
          ],
        }}
        onAssetsChange={onAssetsChange}
      />,
    );
    expect(screen.queryByRole("button", { name: "Open" })).not.toBeInTheDocument();

    rerender(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{
          status: "ready",
          assets: [
            asset({
              origin: "PUBLICLY_DISCOVERED",
              rightsState: "REUSE_RIGHTS_UNCONFIRMED",
              validationState: "INVALID",
              lifecycleState: "AVAILABLE",
              originalFilename: "bad.jpg",
            }),
          ],
        }}
        onAssetsChange={onAssetsChange}
      />,
    );
    expect(screen.queryByRole("button", { name: "Open" })).not.toBeInTheDocument();
  });

  it("remove confirm/cancel and success reload", async () => {
    removeProjectAssetAction.mockResolvedValue({
      ok: true,
      assets: {
        status: "ready",
        assets: [asset({ lifecycleState: "REMOVED", version: 3 })],
      },
    });

    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [asset()] }}
        onAssetsChange={onAssetsChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("button", { name: "Confirm remove" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("button", { name: "Confirm remove" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm remove" }));
    await waitFor(() => {
      expect(removeProjectAssetAction).toHaveBeenCalledWith(
        expect.objectContaining({ expectedVersion: 1, assetId: asset().id }),
      );
    });
    expect(onAssetsChange).toHaveBeenCalled();
  });

  it("retains SAME remove identity across temporary_failure REMOVAL_PENDING retry", async () => {
    const pending = asset({
      lifecycleState: "REMOVAL_PENDING",
      version: 2,
      originalFilename: "logo.png",
    });
    const removed = asset({ lifecycleState: "REMOVED", version: 3 });

    removeProjectAssetAction
      .mockResolvedValueOnce({
        ok: false,
        category: "temporary_failure",
        message: "Storage delete delayed",
        assets: { status: "ready", assets: [pending] },
      })
      .mockResolvedValueOnce({
        ok: true,
        assets: { status: "ready", assets: [removed] },
      });

    const { rerender } = render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [asset()] }}
        onAssetsChange={onAssetsChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm remove" }));

    await waitFor(() => {
      expect(removeProjectAssetAction).toHaveBeenCalledTimes(1);
      expect(onAssetsChange).toHaveBeenCalledWith({
        status: "ready",
        assets: [pending],
      });
    });

    const firstCall = removeProjectAssetAction.mock.calls[0]![0];
    expect(firstCall.expectedVersion).toBe(1);

    rerender(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [pending] }}
        onAssetsChange={onAssetsChange}
      />,
    );

    expect(screen.getByText("Removing")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry removal/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Remove$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Retry removal/i }));

    await waitFor(() => {
      expect(removeProjectAssetAction).toHaveBeenCalledTimes(2);
    });
    const secondCall = removeProjectAssetAction.mock.calls[1]![0];
    expect(secondCall).toEqual(firstCall);
    expect(secondCall.expectedVersion).toBe(1);
    expect(secondCall.expectedVersion).not.toBe(2);

    await waitFor(() => {
      expect(onAssetsChange).toHaveBeenCalledWith({
        status: "ready",
        assets: [removed],
      });
    });
    expect(screen.queryByRole("button", { name: /Retry removal/i })).not.toBeInTheDocument();
  });

  it("shows discovered rights controls and DO_NOT_USE presentation", async () => {
    updateProjectAssetRightsAction.mockResolvedValue({
      ok: true,
      assets: {
        status: "ready",
        assets: [
          asset({
            origin: "PUBLICLY_DISCOVERED",
            rightsState: "DO_NOT_USE",
            originalFilename: "found.jpg",
          }),
        ],
      },
    });

    const { rerender } = render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{
          status: "ready",
          assets: [
            asset({
              origin: "PUBLICLY_DISCOVERED",
              rightsState: "REUSE_RIGHTS_UNCONFIRMED",
              originalFilename: "found.jpg",
            }),
          ],
        }}
        onAssetsChange={onAssetsChange}
      />,
    );

    expect(screen.getByText(/found this file publicly/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Don't use/i }));
    await waitFor(() => {
      expect(updateProjectAssetRightsAction).toHaveBeenCalledWith(
        expect.objectContaining({ decision: "DO_NOT_USE" }),
      );
    });

    rerender(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{
          status: "ready",
          assets: [
            asset({
              origin: "PUBLICLY_DISCOVERED",
              rightsState: "DO_NOT_USE",
              originalFilename: "found.jpg",
            }),
          ],
        }}
        onAssetsChange={onAssetsChange}
      />,
    );
    expect(screen.getByText(/don’t use for this project/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Use for this project/i })).not.toBeInTheDocument();
  });

  it("hides rights controls for REMOVAL_PENDING and REMOVED discovered rows", () => {
    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{
          status: "ready",
          assets: [
            asset({
              id: "00000000-0000-4000-8000-0000000000b1",
              origin: "PUBLICLY_DISCOVERED",
              rightsState: "REUSE_RIGHTS_UNCONFIRMED",
              lifecycleState: "REMOVAL_PENDING",
              originalFilename: "removing-found.jpg",
            }),
            asset({
              id: "00000000-0000-4000-8000-0000000000b2",
              origin: "PUBLICLY_DISCOVERED",
              rightsState: "REUSE_RIGHTS_UNCONFIRMED",
              lifecycleState: "REMOVED",
              originalFilename: "removed-found.jpg",
            }),
          ],
        }}
        onAssetsChange={onAssetsChange}
      />,
    );
    expect(screen.queryByRole("button", { name: /Use for this project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Don't use/i })).not.toBeInTheDocument();
  });

  it("CONFIRM_PROJECT_USE posts exact decision", async () => {
    updateProjectAssetRightsAction.mockResolvedValue({
      ok: true,
      assets: { status: "ready", assets: [] },
    });
    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{
          status: "ready",
          assets: [
            asset({
              origin: "PUBLICLY_DISCOVERED",
              rightsState: "REUSE_RIGHTS_UNCONFIRMED",
            }),
          ],
        }}
        onAssetsChange={onAssetsChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Use for this project/i }));
    await waitFor(() => {
      expect(updateProjectAssetRightsAction).toHaveBeenCalledWith(
        expect.objectContaining({ decision: "CONFIRM_PROJECT_USE", expectedVersion: 1 }),
      );
    });
  });

  it("never runs more than 3 active upload jobs for 5 selected files", async () => {
    const gates: Array<ReturnType<typeof deferred<void>>> = [];
    let inFlight = 0;
    let maxInFlight = 0;

    createProjectAssetUploadIntentAction.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      const gate = deferred<void>();
      gates.push(gate);
      await gate.promise;
      const index = gates.indexOf(gate);
      return {
        ok: true,
        asset: asset({
          id: `00000000-0000-4000-8000-0000000000${String(10 + index).padStart(2, "0")}`,
          lifecycleState: "PENDING_UPLOAD",
          validationState: "UNVALIDATED",
          availableAt: null,
          originalFilename: `f${index}.png`,
        }),
        upload: {
          provider: "SUPABASE",
          bucket: "b",
          path: `p/${index}`,
          token: `t${index}`,
          expiresAt: null,
        },
        replayed: false,
      };
    });
    uploadFileToSignedCapability.mockImplementation(async () => {
      maxInFlight = Math.max(maxInFlight, inFlight);
      return { ok: true };
    });
    completeProjectAssetUploadAction.mockImplementation(async (input: { assetId: string }) => {
      maxInFlight = Math.max(maxInFlight, inFlight);
      inFlight -= 1;
      return {
        ok: true,
        assets: {
          status: "ready",
          assets: [
            asset({
              id: input.assetId,
              lifecycleState: "AVAILABLE",
              validationState: "VALID",
              version: 2,
            }),
          ],
        },
      };
    });

    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [] }}
        onAssetsChange={onAssetsChange}
      />,
    );

    const files = [1, 2, 3, 4, 5].map(
      (n) => new File([`x${n}`], `f${n}.png`, { type: "image/png" }),
    );
    fireEvent.change(screen.getByLabelText(/Add files/i), {
      target: { files },
    });

    await waitFor(() => {
      expect(createProjectAssetUploadIntentAction).toHaveBeenCalledTimes(3);
    });
    expect(maxInFlight).toBeLessThanOrEqual(3);
    expect(inFlight).toBe(3);

    await act(async () => {
      gates[0]!.resolve();
      gates[1]!.resolve();
      gates[2]!.resolve();
    });

    await waitFor(() => {
      expect(createProjectAssetUploadIntentAction).toHaveBeenCalledTimes(5);
    });
    expect(maxInFlight).toBeLessThanOrEqual(3);

    await act(async () => {
      for (const gate of gates.slice(3)) {
        gate.resolve();
      }
    });

    await waitFor(() => {
      expect(completeProjectAssetUploadAction).toHaveBeenCalledTimes(5);
    });
    expect(maxInFlight).toBeLessThanOrEqual(3);
    expect(maxInFlight).toBe(3);
  });

  it("treats invalid finalize as durable FAILED/INVALID with no retry", async () => {
    const pending = asset({
      lifecycleState: "PENDING_UPLOAD",
      validationState: "UNVALIDATED",
      availableAt: null,
    });
    const failed = asset({
      lifecycleState: "FAILED",
      validationState: "INVALID",
      version: 2,
      failedAt: "2026-01-01T00:01:00.000Z",
      availableAt: null,
    });

    createProjectAssetUploadIntentAction.mockResolvedValue({
      ok: true,
      asset: pending,
      upload: {
        provider: "SUPABASE",
        bucket: "b",
        path: "p",
        token: "t",
        expiresAt: null,
      },
      replayed: false,
    });
    uploadFileToSignedCapability.mockResolvedValue({ ok: true });
    completeProjectAssetUploadAction.mockResolvedValue({
      ok: false,
      category: "invalid_input",
      message: "Validation failed",
    });
    refreshProjectAssetsAction.mockResolvedValue({
      ok: true,
      assets: { status: "ready", assets: [failed] },
    });

    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [] }}
        onAssetsChange={onAssetsChange}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Add files/i), {
      target: { files: [new File(["x"], "bad.png", { type: "image/png" })] },
    });

    await waitFor(() => {
      expect(onAssetsChange).toHaveBeenCalledWith({
        status: "ready",
        assets: [failed],
      });
    });
    expect(
      await screen.findByText("This file couldn’t be accepted. Choose another file."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Retry upload/i })).not.toBeInTheDocument();
    expect(createProjectAssetUploadIntentAction).toHaveBeenCalledTimes(1);
    expect(uploadFileToSignedCapability).toHaveBeenCalledTimes(1);
    expect(completeProjectAssetUploadAction).toHaveBeenCalledTimes(1);
  });

  it("ambiguity probe durable FAILED/INVALID clears Retry upload", async () => {
    const pending = asset({
      lifecycleState: "PENDING_UPLOAD",
      validationState: "UNVALIDATED",
      availableAt: null,
    });
    const failed = asset({
      lifecycleState: "FAILED",
      validationState: "INVALID",
      version: 2,
      availableAt: null,
      failedAt: "2026-01-01T00:01:00.000Z",
    });

    createProjectAssetUploadIntentAction.mockResolvedValue({
      ok: true,
      asset: pending,
      upload: {
        provider: "SUPABASE",
        bucket: "b",
        path: "p",
        token: "tok",
        expiresAt: null,
      },
      replayed: false,
    });
    uploadFileToSignedCapability.mockResolvedValue({
      ok: false,
      message: "Upload to storage failed. Please try again.",
    });
    completeProjectAssetUploadAction.mockResolvedValue({
      ok: false,
      category: "invalid_input",
      message: "Validation failed",
    });
    refreshProjectAssetsAction.mockResolvedValue({
      ok: true,
      assets: { status: "ready", assets: [failed] },
    });

    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [] }}
        onAssetsChange={onAssetsChange}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Add files/i), {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });

    expect(await screen.findByRole("button", { name: /Retry upload/i })).toBeInTheDocument();
    expect(completeProjectAssetUploadAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Retry upload/i }));

    await waitFor(() => {
      expect(completeProjectAssetUploadAction).toHaveBeenCalledTimes(1);
      expect(onAssetsChange).toHaveBeenCalledWith({
        status: "ready",
        assets: [failed],
      });
    });
    expect(screen.queryByText(/File added to this project/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Retry upload/i })).not.toBeInTheDocument();
    expect(createProjectAssetUploadIntentAction).toHaveBeenCalledTimes(2);
    expect(uploadFileToSignedCapability).toHaveBeenCalledTimes(2);
    const completeArgs = completeProjectAssetUploadAction.mock.calls[0]![0];
    expect(completeArgs).toMatchObject({
      assetId: pending.id,
      expectedVersion: pending.version,
    });
  });

  it("converges to done when complete temporary-fails but refresh is AVAILABLE+VALID", async () => {
    const pending = asset({
      lifecycleState: "PENDING_UPLOAD",
      validationState: "UNVALIDATED",
      availableAt: null,
    });
    const ready = asset({
      lifecycleState: "AVAILABLE",
      validationState: "VALID",
      version: 2,
    });

    createProjectAssetUploadIntentAction.mockResolvedValue({
      ok: true,
      asset: pending,
      upload: {
        provider: "SUPABASE",
        bucket: "b",
        path: "p",
        token: "t",
        expiresAt: null,
      },
      replayed: false,
    });
    uploadFileToSignedCapability.mockResolvedValue({ ok: true });
    completeProjectAssetUploadAction.mockResolvedValue({
      ok: false,
      category: "temporary_failure",
      message: "Lost response",
    });
    refreshProjectAssetsAction.mockResolvedValue({
      ok: true,
      assets: { status: "ready", assets: [ready] },
    });

    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [] }}
        onAssetsChange={onAssetsChange}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Add files/i), {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });

    await waitFor(() => {
      expect(onAssetsChange).toHaveBeenCalledWith({
        status: "ready",
        assets: [ready],
      });
    });
    expect(await screen.findByText(/File added to this project/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Retry upload/i })).not.toBeInTheDocument();
    expect(uploadFileToSignedCapability).toHaveBeenCalledTimes(1);
    expect(completeProjectAssetUploadAction).toHaveBeenCalledTimes(1);
  });

  it("queues complete-only retry behind three active upload slots", async () => {
    const pendingA = asset({
      id: "00000000-0000-4000-8000-0000000000a1",
      lifecycleState: "PENDING_UPLOAD",
      validationState: "UNVALIDATED",
      availableAt: null,
      originalFilename: "a.png",
    });
    const readyA = asset({
      id: pendingA.id,
      lifecycleState: "AVAILABLE",
      validationState: "VALID",
      version: 2,
      originalFilename: "a.png",
    });

    const bcdGates: Array<ReturnType<typeof deferred<void>>> = [];
    let activeSlots = 0;
    let maxActive = 0;

    createProjectAssetUploadIntentAction.mockImplementation(async (input: {
      originalFilename: string;
    }) => {
      if (input.originalFilename === "a.png") {
        return {
          ok: true,
          asset: pendingA,
          upload: {
            provider: "SUPABASE",
            bucket: "b",
            path: "p/a",
            token: "ta",
            expiresAt: null,
          },
          replayed: false,
        };
      }
      activeSlots += 1;
      maxActive = Math.max(maxActive, activeSlots);
      const gate = deferred<void>();
      bcdGates.push(gate);
      await gate.promise;
      const n = bcdGates.indexOf(gate) + 2;
      return {
        ok: true,
        asset: asset({
          id: `00000000-0000-4000-8000-0000000000b${n}`,
          lifecycleState: "PENDING_UPLOAD",
          validationState: "UNVALIDATED",
          availableAt: null,
          originalFilename: input.originalFilename,
        }),
        upload: {
          provider: "SUPABASE",
          bucket: "b",
          path: `p/${input.originalFilename}`,
          token: `t-${input.originalFilename}`,
          expiresAt: null,
        },
        replayed: false,
      };
    });

    uploadFileToSignedCapability.mockImplementation(async (input: { file: File }) => {
      maxActive = Math.max(maxActive, activeSlots);
      if (input.file.name === "a.png") return { ok: true };
      return { ok: true };
    });

    completeProjectAssetUploadAction
      .mockResolvedValueOnce({
        ok: false,
        category: "temporary_failure",
        message: "complete delayed",
      })
      .mockImplementation(async (input: { assetId: string }) => {
        maxActive = Math.max(maxActive, activeSlots);
        if (input.assetId === pendingA.id) {
          return {
            ok: true,
            assets: { status: "ready", assets: [readyA] },
          };
        }
        activeSlots -= 1;
        return {
          ok: true,
          assets: {
            status: "ready",
            assets: [
              asset({
                id: input.assetId,
                lifecycleState: "AVAILABLE",
                validationState: "VALID",
                version: 2,
              }),
            ],
          },
        };
      });

    refreshProjectAssetsAction.mockResolvedValue({
      ok: true,
      assets: { status: "ready", assets: [pendingA] },
    });

    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [] }}
        onAssetsChange={onAssetsChange}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Add files/i), {
      target: { files: [new File(["a"], "a.png", { type: "image/png" })] },
    });

    expect(await screen.findByRole("button", { name: /Retry upload/i })).toBeInTheDocument();
    expect(completeProjectAssetUploadAction).toHaveBeenCalledTimes(1);
    const firstComplete = completeProjectAssetUploadAction.mock.calls[0]![0];
    const intentCallsAfterA = createProjectAssetUploadIntentAction.mock.calls.length;
    const uploadCallsAfterA = uploadFileToSignedCapability.mock.calls.length;

    fireEvent.change(screen.getByLabelText(/Add files/i), {
      target: {
        files: [
          new File(["b"], "b.png", { type: "image/png" }),
          new File(["c"], "c.png", { type: "image/png" }),
          new File(["d"], "d.png", { type: "image/png" }),
        ],
      },
    });

    await waitFor(() => {
      expect(bcdGates.length).toBe(3);
    });
    expect(activeSlots).toBe(3);
    expect(maxActive).toBeLessThanOrEqual(3);

    fireEvent.click(screen.getByRole("button", { name: /Retry upload/i }));

    // Complete-only retry must wait for a free slot.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(completeProjectAssetUploadAction).toHaveBeenCalledTimes(1);
    expect(maxActive).toBeLessThanOrEqual(3);

    await act(async () => {
      bcdGates[0]!.resolve();
      bcdGates[1]!.resolve();
      bcdGates[2]!.resolve();
    });

    await waitFor(() => {
      const aCompletes = completeProjectAssetUploadAction.mock.calls.filter(
        (call) => (call[0] as { assetId: string }).assetId === pendingA.id,
      );
      expect(aCompletes.length).toBe(2);
    });
    const aCompletes = completeProjectAssetUploadAction.mock.calls.filter(
      (call) => (call[0] as { assetId: string }).assetId === pendingA.id,
    );
    expect(aCompletes[1]![0]).toEqual(firstComplete);
    expect(createProjectAssetUploadIntentAction.mock.calls.length).toBe(
      intentCallsAfterA + 3,
    );
    expect(
      uploadFileToSignedCapability.mock.calls.filter(
        (call) => (call[0] as { file: File }).file.name === "a.png",
      ),
    ).toHaveLength(uploadCallsAfterA);
    expect(maxActive).toBeLessThanOrEqual(3);
    expect(maxActive).toBe(3);
  });

  it("authoritative pending customer upload can retry finishing after local job state is lost", async () => {
    const pendingId = "00000000-0000-4000-8000-0000000000d1";
    const pending = asset({
      id: pendingId,
      originalFilename: "stranded.png",
      lifecycleState: "PENDING_UPLOAD",
      validationState: "UNVALIDATED",
      availableAt: null,
      version: 1,
    });
    const ready = asset({
      id: pendingId,
      originalFilename: "stranded.png",
      lifecycleState: "AVAILABLE",
      validationState: "VALID",
      version: 2,
    });

    completeProjectAssetUploadAction.mockResolvedValue({
      ok: true,
      assets: { status: "ready", assets: [ready] },
    });

    function Harness() {
      const [assetsState, setAssetsState] = useState({
        status: "ready" as const,
        assets: [pending],
      });
      return (
        <ProjectAssetsPanel
          projectId={projectId}
          assets={assetsState}
          onAssetsChange={(next) => {
            onAssetsChange(next);
            setAssetsState(
              next.status === "ready"
                ? next
                : { status: "ready", assets: [pending] },
            );
          }}
        />
      );
    }

    render(<Harness />);

    const row = document.querySelector(`li[data-asset-id="${pendingId}"]`);
    expect(row).not.toBeNull();
    const retry = screen.getByRole("button", {
      name: /Retry finishing upload/i,
    });
    expect(retry).toHaveAttribute("data-asset-id", pendingId);

    fireEvent.click(retry);

    await waitFor(() => {
      expect(completeProjectAssetUploadAction).toHaveBeenCalledTimes(1);
    });
    expect(completeProjectAssetUploadAction).toHaveBeenCalledWith({
      projectId,
      assetId: pendingId,
      expectedVersion: 1,
      operationId: expect.any(String),
      correlationId: expect.any(String),
    });
    const args = completeProjectAssetUploadAction.mock.calls[0]![0] as {
      operationId: string;
      correlationId: string;
    };
    expect(args.operationId.length).toBeGreaterThan(0);
    expect(args.correlationId.length).toBeGreaterThan(0);
    expect(createProjectAssetUploadIntentAction).not.toHaveBeenCalled();
    expect(uploadFileToSignedCapability).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(onAssetsChange).toHaveBeenCalledWith({
        status: "ready",
        assets: [ready],
      });
    });
    expect(
      screen.queryByRole("button", { name: /Retry finishing upload/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/File added to this project/i)).toBeInTheDocument();
  });

  it("durable row complete retry reuses operation and correlation IDs on same-page transient failure", async () => {
    const pendingId = "00000000-0000-4000-8000-0000000000d2";
    const pending = asset({
      id: pendingId,
      originalFilename: "retry-me.png",
      lifecycleState: "PENDING_UPLOAD",
      validationState: "UNVALIDATED",
      availableAt: null,
      version: 3,
    });
    const ready = asset({
      id: pendingId,
      originalFilename: "retry-me.png",
      lifecycleState: "AVAILABLE",
      validationState: "VALID",
      version: 4,
    });

    completeProjectAssetUploadAction
      .mockResolvedValueOnce({
        ok: false,
        category: "temporary_failure",
        message: "Temporary complete failure",
        assets: { status: "ready", assets: [pending] },
      })
      .mockResolvedValueOnce({
        ok: true,
        assets: { status: "ready", assets: [ready] },
      });

    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{ status: "ready", assets: [pending] }}
        onAssetsChange={onAssetsChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Retry finishing upload/i }),
    );

    await waitFor(() => {
      expect(completeProjectAssetUploadAction).toHaveBeenCalledTimes(1);
    });
    const first = completeProjectAssetUploadAction.mock.calls[0]![0];

    fireEvent.click(
      screen.getByRole("button", { name: /Retry finishing upload/i }),
    );

    await waitFor(() => {
      expect(completeProjectAssetUploadAction).toHaveBeenCalledTimes(2);
    });
    const second = completeProjectAssetUploadAction.mock.calls[1]![0];
    expect(second).toEqual(first);
    expect(second).toMatchObject({
      assetId: pendingId,
      expectedVersion: 3,
      operationId: (first as { operationId: string }).operationId,
      correlationId: (first as { correlationId: string }).correlationId,
    });
    expect(createProjectAssetUploadIntentAction).not.toHaveBeenCalled();
    expect(uploadFileToSignedCapability).not.toHaveBeenCalled();
  });

  it("local complete-only job suppresses durable row retry for the same asset", async () => {
    const pending = asset({
      lifecycleState: "PENDING_UPLOAD",
      validationState: "UNVALIDATED",
      availableAt: null,
    });

    createProjectAssetUploadIntentAction.mockResolvedValue({
      ok: true,
      asset: pending,
      upload: {
        provider: "SUPABASE",
        bucket: "fp-project-assets",
        path: "projects/p/a/obj",
        token: "tok",
        expiresAt: null,
      },
      replayed: false,
    });
    uploadFileToSignedCapability.mockResolvedValue({ ok: true });
    completeProjectAssetUploadAction.mockResolvedValue({
      ok: false,
      category: "temporary_failure",
      message: "Temporary complete failure",
    });
    refreshProjectAssetsAction.mockResolvedValue({
      ok: true,
      assets: { status: "ready", assets: [pending] },
    });

    function Harness() {
      const [assetsState, setAssetsState] = useState({
        status: "ready" as const,
        assets: [] as ProjectAsset[],
      });
      return (
        <ProjectAssetsPanel
          projectId={projectId}
          assets={assetsState}
          onAssetsChange={(next) => {
            onAssetsChange(next);
            setAssetsState(
              next.status === "ready"
                ? next
                : { status: "ready", assets: [] },
            );
          }}
        />
      );
    }

    render(<Harness />);

    fireEvent.change(screen.getByLabelText(/Add files/i), {
      target: { files: [new File(["png"], "logo.png", { type: "image/png" })] },
    });

    expect(
      await screen.findByRole("button", { name: /Retry upload/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Needs finish retry/i)).toBeInTheDocument();

    const authoritativeRow = document.querySelector(
      `li[data-asset-id="${pending.id}"]`,
    );
    expect(authoritativeRow).not.toBeNull();
    expect(authoritativeRow).toHaveTextContent(pending.originalFilename);
    expect(authoritativeRow).toHaveTextContent(/Finishing upload/i);

    expect(
      screen.queryByRole("button", { name: /Retry finishing upload/i }),
    ).not.toBeInTheDocument();

    expect(createProjectAssetUploadIntentAction).toHaveBeenCalledTimes(1);
    expect(uploadFileToSignedCapability).toHaveBeenCalledTimes(1);
    expect(completeProjectAssetUploadAction).toHaveBeenCalledTimes(1);
    expect(refreshProjectAssetsAction).toHaveBeenCalled();
  });

  it("does not offer durable finish retry for AVAILABLE, FAILED, or discovered assets", () => {
    const availableId = "00000000-0000-4000-8000-0000000000e1";
    const failedId = "00000000-0000-4000-8000-0000000000e2";
    const discoveredId = "00000000-0000-4000-8000-0000000000e3";

    render(
      <ProjectAssetsPanel
        projectId={projectId}
        assets={{
          status: "ready",
          assets: [
            asset({
              id: availableId,
              originalFilename: "ready.png",
              lifecycleState: "AVAILABLE",
              validationState: "VALID",
            }),
            asset({
              id: failedId,
              originalFilename: "failed.png",
              lifecycleState: "FAILED",
              validationState: "INVALID",
            }),
            asset({
              id: discoveredId,
              originalFilename: "found.png",
              origin: "PUBLICLY_DISCOVERED",
              lifecycleState: "PENDING_UPLOAD",
              validationState: "UNVALIDATED",
              rightsState: "REUSE_RIGHTS_UNCONFIRMED",
              availableAt: null,
            }),
          ],
        }}
        onAssetsChange={onAssetsChange}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /Retry finishing upload/i }),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector(`li[data-asset-id="${availableId}"]`),
    ).not.toBeNull();
    expect(
      document.querySelector(`li[data-asset-id="${failedId}"]`),
    ).not.toBeNull();
    expect(
      document.querySelector(`li[data-asset-id="${discoveredId}"]`),
    ).not.toBeNull();
  });

  it("reconciles durable complete stale_or_conflicting when authoritative row is AVAILABLE", async () => {
    const pendingId = "00000000-0000-4000-8000-0000000000d3";
    const pending = asset({
      id: pendingId,
      originalFilename: "stale.png",
      lifecycleState: "PENDING_UPLOAD",
      validationState: "UNVALIDATED",
      availableAt: null,
      version: 1,
    });
    const ready = asset({
      id: pendingId,
      originalFilename: "stale.png",
      lifecycleState: "AVAILABLE",
      validationState: "VALID",
      version: 2,
    });

    completeProjectAssetUploadAction.mockResolvedValue({
      ok: false,
      category: "stale_or_conflicting",
      message: "State changed",
      assets: { status: "ready", assets: [ready] },
    });

    function Harness() {
      const [assetsState, setAssetsState] = useState({
        status: "ready" as const,
        assets: [pending],
      });
      return (
        <ProjectAssetsPanel
          projectId={projectId}
          assets={assetsState}
          onAssetsChange={(next) => {
            onAssetsChange(next);
            setAssetsState(
              next.status === "ready"
                ? next
                : { status: "ready", assets: [pending] },
            );
          }}
        />
      );
    }

    render(<Harness />);

    fireEvent.click(
      screen.getByRole("button", { name: /Retry finishing upload/i }),
    );

    await waitFor(() => {
      expect(completeProjectAssetUploadAction).toHaveBeenCalledTimes(1);
    });
    expect(createProjectAssetUploadIntentAction).not.toHaveBeenCalled();
    expect(uploadFileToSignedCapability).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(onAssetsChange).toHaveBeenCalledWith({
        status: "ready",
        assets: [ready],
      });
    });
    expect(
      screen.queryByRole("button", { name: /Retry finishing upload/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/File added to this project/i)).toBeInTheDocument();
    expect(completeProjectAssetUploadAction).toHaveBeenCalledTimes(1);
  });

  it("durable finish retry follows existing signInPath auth redirect", async () => {
    const pending = asset({
      id: "00000000-0000-4000-8000-0000000000d4",
      lifecycleState: "PENDING_UPLOAD",
      validationState: "UNVALIDATED",
      availableAt: null,
    });

    completeProjectAssetUploadAction.mockResolvedValue({
      ok: false,
      category: "auth_required",
      message: "Sign in required",
      signInPath: "/sign-in?next=%2Fportal",
    });
    refreshProjectAssetsAction.mockResolvedValue({
      ok: false,
      category: "auth_required",
      message: "Sign in required",
      signInPath: "/sign-in?next=%2Fportal",
    });

    // jsdom may not allow spying location.assign; stub the whole location.
    const assign = vi.fn();
    const previous = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...previous, assign },
    });

    try {
      render(
        <ProjectAssetsPanel
          projectId={projectId}
          assets={{ status: "ready", assets: [pending] }}
          onAssetsChange={onAssetsChange}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: /Retry finishing upload/i }),
      );

      await waitFor(() => {
        expect(assign).toHaveBeenCalledWith("/sign-in?next=%2Fportal");
      });
      expect(createProjectAssetUploadIntentAction).not.toHaveBeenCalled();
      expect(uploadFileToSignedCapability).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: previous,
      });
    }
  });
});
