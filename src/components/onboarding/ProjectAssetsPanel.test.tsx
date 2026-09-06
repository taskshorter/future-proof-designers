import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
});
