"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ProjectAsset } from "@/lib/factory/contract";
import {
  completeProjectAssetUploadAction,
  createProjectAssetReadIntentAction,
  createProjectAssetUploadIntentAction,
  refreshProjectAssetsAction,
  removeProjectAssetAction,
  updateProjectAssetRightsAction,
  type ProjectAssetsLoadState,
} from "@/lib/onboarding/actions";
import {
  acceptAttributeForFileInput,
  advisoryCheckSelectedFile,
} from "@/lib/project-assets/advisory";
import { uploadFileToSignedCapability } from "@/lib/project-assets/browser-upload";
import {
  assetDisplaySize,
  assetKindLabel,
  assetRightsLabel,
  assetStatusLabel,
} from "@/lib/project-assets/labels";
import {
  MAX_CONCURRENT_UPLOADS,
  countActiveUploadJobs,
  selectNextQueuedJobs,
  type LocalUploadJob,
} from "@/lib/project-assets/upload-queue";

type ProjectAssetsPanelProps = {
  projectId: string;
  assets: ProjectAssetsLoadState;
  onAssetsChange: (assets: ProjectAssetsLoadState) => void;
};

/** Ephemeral in-memory remove intent — discarded on full page reload. */
type RemovalIntent = {
  assetId: string;
  operationId: string;
  correlationId: string;
  /** Original AVAILABLE version accepted for this removal — never REMOVAL_PENDING version. */
  expectedVersion: number;
};

function newId(): string {
  return crypto.randomUUID();
}

function createLocalJob(file: File): LocalUploadJob {
  return {
    localId: newId(),
    file,
    uploadIntentOperationId: newId(),
    uploadIntentCorrelationId: newId(),
    completeOperationId: newId(),
    completeCorrelationId: newId(),
    phase: "queued",
  };
}

function rowClassName(asset: ProjectAsset): string {
  if (
    asset.lifecycleState === "REMOVED" ||
    asset.lifecycleState === "REMOVAL_PENDING"
  ) {
    return "project-asset-row muted-row";
  }
  if (
    asset.lifecycleState === "FAILED" ||
    asset.validationState === "INVALID"
  ) {
    return "project-asset-row failed-row";
  }
  if (asset.lifecycleState === "PENDING_UPLOAD") {
    return "project-asset-row pending-row";
  }
  return "project-asset-row";
}

function findAsset(
  assetsState: ProjectAssetsLoadState,
  assetId: string,
): ProjectAsset | undefined {
  if (assetsState.status !== "ready") return undefined;
  return assetsState.assets.find((entry) => entry.id === assetId);
}

function reconcileCompleteAgainstAssets(
  assetsState: ProjectAssetsLoadState,
  assetId: string,
): "done" | "durable_failure" | "retry" {
  const row = findAsset(assetsState, assetId);
  if (!row) return "retry";
  if (row.lifecycleState === "AVAILABLE" && row.validationState === "VALID") {
    return "done";
  }
  if (
    row.lifecycleState === "FAILED" ||
    row.validationState === "INVALID"
  ) {
    return "durable_failure";
  }
  return "retry";
}

export function ProjectAssetsPanel({
  projectId,
  assets: assetsState,
  onAssetsChange,
}: ProjectAssetsPanelProps) {
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<LocalUploadJob[]>([]);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [busyAssetId, setBusyAssetId] = useState<string | null>(null);
  const [removalIntents, setRemovalIntents] = useState<
    Record<string, RemovalIntent>
  >({});
  const jobsRef = useRef(jobs);
  const pumpRunning = useRef(false);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const updateJobs = useCallback(
    (updater: (prev: LocalUploadJob[]) => LocalUploadJob[]) => {
      setJobs((prev) => {
        const next = updater(prev);
        jobsRef.current = next;
        return next;
      });
    },
    [],
  );

  const applyAssets = useCallback(
    (next: ProjectAssetsLoadState) => {
      onAssetsChange(next);
      if (next.status === "ready") {
        setRemovalIntents((prev) => {
          const kept: Record<string, RemovalIntent> = {};
          for (const [assetId, intent] of Object.entries(prev)) {
            const row = next.assets.find((entry) => entry.id === assetId);
            if (!row) continue;
            if (row.lifecycleState === "REMOVED") continue;
            if (row.lifecycleState === "REMOVAL_PENDING") {
              kept[assetId] = intent;
            }
          }
          return kept;
        });
      }
    },
    [onAssetsChange],
  );

  const reloadAssets = useCallback(async () => {
    setRefreshing(true);
    setPanelError(null);
    const result = await refreshProjectAssetsAction(projectId);
    setRefreshing(false);
    if (!result.ok) {
      setPanelError(result.message);
      if (result.signInPath) {
        window.location.assign(result.signInPath);
      }
      return null;
    }
    applyAssets(result.assets);
    return result.assets;
  }, [applyAssets, projectId]);

  const finishCompleteSuccess = useCallback(
    (assets: ProjectAssetsLoadState, localId: string) => {
      applyAssets(assets);
      updateJobs((prev) =>
        prev.map((entry) =>
          entry.localId === localId
            ? {
                ...entry,
                phase: "done",
                message: undefined,
                failureStage: undefined,
                uploadConfirmed: true,
              }
            : entry,
        ),
      );
      setPanelMessage("File added to this project.");
    },
    [applyAssets, updateJobs],
  );

  const finishDurableCompleteFailure = useCallback(
    (assets: ProjectAssetsLoadState, localId: string) => {
      applyAssets(assets);
      updateJobs((prev) =>
        prev.map((entry) =>
          entry.localId === localId
            ? {
                ...entry,
                phase: "failed",
                failureStage: undefined,
                message: "This file couldn’t be accepted. Choose another file.",
              }
            : entry,
        ),
      );
    },
    [applyAssets, updateJobs],
  );

  /**
   * After any Factory complete failure with a known assetId, reconcile against
   * authoritative assets before choosing local retry stage.
   */
  const settleFailedComplete = useCallback(
    async (input: {
      localId: string;
      assetId: string;
      expectedVersion: number;
      message: string;
      assetsFromResponse?: ProjectAssetsLoadState;
      signInPath?: string;
      /** true: Storage already succeeded → complete-only retry if pending. */
      storageConfirmed: boolean;
    }): Promise<void> => {
      if (input.signInPath) {
        window.location.assign(input.signInPath);
      }

      let assets = input.assetsFromResponse ?? null;
      if (assets) {
        applyAssets(assets);
      } else {
        assets = await reloadAssets();
      }

      if (!assets || assets.status !== "ready") {
        updateJobs((prev) =>
          prev.map((entry) =>
            entry.localId === input.localId
              ? {
                  ...entry,
                  phase: "failed",
                  failureStage: input.storageConfirmed ? "complete" : "upload",
                  uploadConfirmed: input.storageConfirmed,
                  assetId: input.assetId,
                  expectedVersion: input.expectedVersion,
                  message: input.message,
                }
              : entry,
          ),
        );
        return;
      }

      const outcome = reconcileCompleteAgainstAssets(assets, input.assetId);
      if (outcome === "done") {
        finishCompleteSuccess(assets, input.localId);
        return;
      }
      if (outcome === "durable_failure") {
        finishDurableCompleteFailure(assets, input.localId);
        return;
      }

      updateJobs((prev) =>
        prev.map((entry) =>
          entry.localId === input.localId
            ? {
                ...entry,
                phase: "failed",
                failureStage: input.storageConfirmed ? "complete" : "upload",
                uploadConfirmed: input.storageConfirmed,
                assetId: input.assetId,
                expectedVersion: input.expectedVersion,
                message: input.message,
              }
            : entry,
        ),
      );
    },
    [
      applyAssets,
      finishCompleteSuccess,
      finishDurableCompleteFailure,
      reloadAssets,
      updateJobs,
    ],
  );

  const runCompleteOnly = useCallback(
    async (job: LocalUploadJob) => {
      if (!job.assetId || job.expectedVersion == null) {
        updateJobs((prev) =>
          prev.map((entry) =>
            entry.localId === job.localId
              ? {
                  ...entry,
                  phase: "failed",
                  failureStage: "intent",
                  uploadConfirmed: false,
                  message: "Upload state is incomplete. Retry from the start.",
                }
              : entry,
          ),
        );
        return;
      }

      updateJobs((prev) =>
        prev.map((entry) =>
          entry.localId === job.localId
            ? {
                ...entry,
                phase: "completing",
                message: undefined,
                uploadConfirmed: true,
                failureStage: "complete",
              }
            : entry,
        ),
      );

      const completed = await completeProjectAssetUploadAction({
        projectId,
        assetId: job.assetId,
        operationId: job.completeOperationId,
        correlationId: job.completeCorrelationId,
        expectedVersion: job.expectedVersion,
      });

      if (!completed.ok) {
        await settleFailedComplete({
          localId: job.localId,
          assetId: job.assetId,
          expectedVersion: job.expectedVersion,
          message: completed.message,
          assetsFromResponse: completed.assets,
          signInPath: completed.signInPath,
          storageConfirmed: true,
        });
        return;
      }

      finishCompleteSuccess(completed.assets, job.localId);
    },
    [finishCompleteSuccess, projectId, settleFailedComplete, updateJobs],
  );

  const runUploadJob = useCallback(
    async (jobSnapshot: LocalUploadJob) => {
      const job =
        jobsRef.current.find((entry) => entry.localId === jobSnapshot.localId) ??
        jobSnapshot;

      const mark = (patch: Partial<LocalUploadJob>) => {
        updateJobs((prev) =>
          prev.map((entry) =>
            entry.localId === job.localId ? { ...entry, ...patch } : entry,
          ),
        );
      };

      // Complete-only retry: Storage already succeeded — never re-upload bytes.
      if (
        job.uploadConfirmed &&
        job.failureStage === "complete" &&
        job.assetId &&
        job.expectedVersion != null
      ) {
        await runCompleteOnly(job);
        return;
      }

      const retryingUpload = job.failureStage === "upload";

      mark({ phase: "intent", message: undefined });

      const intent = await createProjectAssetUploadIntentAction({
        projectId,
        operationId: job.uploadIntentOperationId,
        correlationId: job.uploadIntentCorrelationId,
        originalFilename: job.file.name,
        contentType: job.file.type,
        byteSize: job.file.size,
      });

      if (!intent.ok) {
        if (intent.assets) applyAssets(intent.assets);
        mark({
          phase: "failed",
          failureStage: "intent",
          uploadConfirmed: false,
          message: intent.message,
        });
        if (intent.signInPath) window.location.assign(intent.signInPath);
        return;
      }

      mark({
        phase: "uploading",
        assetId: intent.asset.id,
        expectedVersion: intent.asset.version,
        failureStage: undefined,
      });

      const uploaded = await uploadFileToSignedCapability({
        file: job.file,
        upload: intent.upload,
      });

      if (!uploaded.ok) {
        // Ambiguity probe only on upload-stage retry: first client failure may be
        // wrong, but only Factory complete may declare success.
        if (retryingUpload) {
          mark({
            phase: "completing",
            assetId: intent.asset.id,
            expectedVersion: intent.asset.version,
            uploadConfirmed: false,
            failureStage: "upload",
            message: undefined,
          });
          const probed = await completeProjectAssetUploadAction({
            projectId,
            assetId: intent.asset.id,
            operationId: job.completeOperationId,
            correlationId: job.completeCorrelationId,
            expectedVersion: intent.asset.version,
          });
          if (probed.ok) {
            finishCompleteSuccess(probed.assets, job.localId);
            return;
          }
          await settleFailedComplete({
            localId: job.localId,
            assetId: intent.asset.id,
            expectedVersion: intent.asset.version,
            message: uploaded.message,
            assetsFromResponse: probed.assets,
            signInPath: probed.signInPath,
            storageConfirmed: false,
          });
          return;
        }

        mark({
          phase: "failed",
          failureStage: "upload",
          uploadConfirmed: false,
          message: uploaded.message,
          assetId: intent.asset.id,
          expectedVersion: intent.asset.version,
        });
        return;
      }

      mark({
        phase: "completing",
        uploadConfirmed: true,
        assetId: intent.asset.id,
        expectedVersion: intent.asset.version,
        failureStage: undefined,
      });

      const completed = await completeProjectAssetUploadAction({
        projectId,
        assetId: intent.asset.id,
        operationId: job.completeOperationId,
        correlationId: job.completeCorrelationId,
        expectedVersion: intent.asset.version,
      });

      if (!completed.ok) {
        await settleFailedComplete({
          localId: job.localId,
          assetId: intent.asset.id,
          expectedVersion: intent.asset.version,
          message: completed.message,
          assetsFromResponse: completed.assets,
          signInPath: completed.signInPath,
          storageConfirmed: true,
        });
        return;
      }

      finishCompleteSuccess(completed.assets, job.localId);
    },
    [
      applyAssets,
      finishCompleteSuccess,
      projectId,
      runCompleteOnly,
      settleFailedComplete,
      updateJobs,
    ],
  );

  const pumpQueue = useCallback(async () => {
    if (pumpRunning.current) return;
    pumpRunning.current = true;
    try {
      for (;;) {
        const next = selectNextQueuedJobs(
          jobsRef.current,
          MAX_CONCURRENT_UPLOADS,
        );
        if (next.length === 0) break;
        updateJobs((prev) =>
          prev.map((entry) =>
            next.some((job) => job.localId === entry.localId)
              ? { ...entry, phase: "intent", message: undefined }
              : entry,
          ),
        );
        await Promise.all(next.map((job) => runUploadJob(job)));
      }
    } finally {
      pumpRunning.current = false;
      if (
        selectNextQueuedJobs(jobsRef.current, MAX_CONCURRENT_UPLOADS).length > 0
      ) {
        void pumpQueue();
      }
    }
  }, [runUploadJob, updateJobs]);

  useEffect(() => {
    if (jobs.some((job) => job.phase === "queued")) {
      void pumpQueue();
    }
  }, [jobs, pumpQueue]);

  const onFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setPanelError(null);
    setPanelMessage(null);
    const accepted: LocalUploadJob[] = [];
    const messages: string[] = [];

    for (const file of Array.from(fileList)) {
      const check = advisoryCheckSelectedFile(file);
      if (!check.ok) {
        messages.push(`${file.name}: ${check.message}`);
        continue;
      }
      accepted.push(createLocalJob(file));
    }

    if (messages.length > 0) {
      setPanelError(messages.join(" "));
    }
    if (accepted.length > 0) {
      updateJobs((prev) => [
        ...prev.filter((j) => j.phase !== "done"),
        ...accepted,
      ]);
    }
  };

  const retryJob = (localId: string) => {
    const job = jobsRef.current.find((entry) => entry.localId === localId);
    if (!job || job.phase !== "failed" || !job.failureStage) return;

    // Always re-queue so MAX_CONCURRENT_UPLOADS governs complete-only retries too.
    // Preserves operation IDs, failureStage, and uploadConfirmed for runUploadJob.
    updateJobs((prev) =>
      prev.map((entry) =>
        entry.localId === localId
          ? { ...entry, phase: "queued", message: undefined }
          : entry,
      ),
    );
  };

  const handleOpen = async (asset: ProjectAsset) => {
    setBusyAssetId(asset.id);
    setPanelError(null);
    const result = await createProjectAssetReadIntentAction({
      projectId,
      assetId: asset.id,
      operationId: newId(),
      correlationId: newId(),
    });
    setBusyAssetId(null);
    if (!result.ok) {
      if (result.assets) applyAssets(result.assets);
      setPanelError(result.message);
      if (result.signInPath) window.location.assign(result.signInPath);
      return;
    }
    window.open(result.read.url, "_blank", "noopener,noreferrer");
  };

  const executeRemove = async (intent: RemovalIntent) => {
    setBusyAssetId(intent.assetId);
    setPanelError(null);
    const result = await removeProjectAssetAction({
      projectId,
      assetId: intent.assetId,
      operationId: intent.operationId,
      correlationId: intent.correlationId,
      expectedVersion: intent.expectedVersion,
    });
    setBusyAssetId(null);
    setPendingRemoveId(null);

    if (!result.ok) {
      if (result.signInPath) window.location.assign(result.signInPath);

      const assets =
        result.assets ?? (await reloadAssets()) ?? null;
      if (result.assets) applyAssets(result.assets);

      if (result.category === "temporary_failure" && assets) {
        const row = findAsset(assets, intent.assetId);
        if (row?.lifecycleState === "REMOVAL_PENDING") {
          setRemovalIntents((prev) => ({ ...prev, [intent.assetId]: intent }));
          setPanelError(
            "Removal is in progress. You can retry to finish removing this file.",
          );
          return;
        }
      }

      if (result.category === "stale_or_conflicting") {
        if (!result.assets) await reloadAssets();
        const row = findAsset(
          result.assets ?? assetsState,
          intent.assetId,
        );
        if (row?.lifecycleState === "REMOVED") {
          setRemovalIntents((prev) => {
            const next = { ...prev };
            delete next[intent.assetId];
            return next;
          });
          setPanelMessage("File removed.");
          return;
        }
      }

      setPanelError(result.message);
      return;
    }

    setRemovalIntents((prev) => {
      const next = { ...prev };
      delete next[intent.assetId];
      return next;
    });
    applyAssets(result.assets);
    setPanelMessage("File removed.");
  };

  const confirmRemove = async (asset: ProjectAsset) => {
    const existing = removalIntents[asset.id];
    const intent: RemovalIntent =
      existing ??
      ({
        assetId: asset.id,
        operationId: newId(),
        correlationId: newId(),
        expectedVersion: asset.version,
      } satisfies RemovalIntent);

    // Persist BEFORE the network call so temporary_failure can resume same IDs.
    setRemovalIntents((prev) => ({ ...prev, [asset.id]: intent }));
    await executeRemove(intent);
  };

  const retryRemoval = async (assetId: string) => {
    const intent = removalIntents[assetId];
    if (!intent) return;
    await executeRemove(intent);
  };

  const decideRights = async (
    asset: ProjectAsset,
    decision: "CONFIRM_PROJECT_USE" | "DO_NOT_USE",
  ) => {
    setBusyAssetId(asset.id);
    setPanelError(null);
    const result = await updateProjectAssetRightsAction({
      projectId,
      assetId: asset.id,
      operationId: newId(),
      correlationId: newId(),
      expectedVersion: asset.version,
      decision,
    });
    setBusyAssetId(null);
    if (!result.ok) {
      if (result.assets) applyAssets(result.assets);
      else await reloadAssets();
      setPanelError(result.message);
      if (result.signInPath) window.location.assign(result.signInPath);
      return;
    }
    applyAssets(result.assets);
    setPanelMessage(
      decision === "CONFIRM_PROJECT_USE"
        ? "Marked for use on this project."
        : "Marked don’t use.",
    );
  };

  const assets =
    assetsState.status === "ready" ? assetsState.assets : ([] as ProjectAsset[]);
  const activeUploads = countActiveUploadJobs(jobs);
  const visibleJobs = jobs.filter((job) => job.phase !== "done");

  const canOpen = (asset: ProjectAsset) =>
    asset.lifecycleState === "AVAILABLE" && asset.validationState === "VALID";

  const canRemove = (asset: ProjectAsset) =>
    asset.lifecycleState === "AVAILABLE";

  const needsRights = (asset: ProjectAsset) =>
    asset.origin === "PUBLICLY_DISCOVERED" &&
    asset.rightsState === "REUSE_RIGHTS_UNCONFIRMED" &&
    asset.lifecycleState !== "REMOVAL_PENDING" &&
    asset.lifecycleState !== "REMOVED";

  return (
    <section
      className="panel project-assets-panel"
      aria-labelledby="project-files-heading"
    >
      <div className="project-assets-header">
        <div>
          <h2 id="project-files-heading">Project files</h2>
          <p className="muted">
            Add logos, photos, documents, or videos we can use while building
            your site.
          </p>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="secondary"
            disabled={refreshing}
            onClick={() => void reloadAssets()}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {assetsState.status === "unavailable" ? (
        <div className="form-error" role="alert">
          <p>{assetsState.message}</p>
          <p className="muted">
            You can keep answering onboarding questions. File listing will retry
            when you refresh.
          </p>
          <button type="button" onClick={() => void reloadAssets()}>
            Retry file list
          </button>
        </div>
      ) : null}

      {panelError ? (
        <p className="form-error" role="alert" aria-live="polite">
          {panelError}
        </p>
      ) : null}
      {panelMessage ? (
        <p className="form-success" aria-live="polite">
          {panelMessage}
        </p>
      ) : null}

      <div className="project-assets-upload">
        <label className="project-assets-file-label">
          <span>Add files</span>
          <input
            type="file"
            multiple
            accept={acceptAttributeForFileInput()}
            onChange={(event) => {
              onFilesSelected(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <p className="muted">
          JPEG, PNG, WebP, GIF (25 MB), PDF (50 MB), or MP4/WebM/QuickTime (250
          MB). Up to {MAX_CONCURRENT_UPLOADS} uploads at a time.
        </p>
      </div>

      {visibleJobs.length > 0 ? (
        <ul className="project-asset-job-list" aria-live="polite">
          {visibleJobs.map((job) => (
            <li key={job.localId} className="project-asset-job">
              <div>
                <strong>{job.file.name}</strong>
                <span className="muted">
                  {" "}
                  ·{" "}
                  {job.phase === "queued"
                    ? "Waiting"
                    : job.phase === "intent"
                      ? "Preparing upload"
                      : job.phase === "uploading"
                        ? "Uploading"
                        : job.phase === "completing"
                          ? "Finishing"
                          : job.failureStage === "complete"
                            ? "Needs finish retry"
                            : job.failureStage
                              ? "Needs retry"
                              : "Couldn’t be accepted"}
                </span>
              </div>
              {job.message ? <p className="form-error">{job.message}</p> : null}
              {job.phase === "failed" && job.failureStage ? (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => retryJob(job.localId)}
                >
                  Retry upload
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {activeUploads > 0 ? (
        <p className="muted" aria-live="polite">
          Uploading {activeUploads} of up to {MAX_CONCURRENT_UPLOADS}…
        </p>
      ) : null}

      {assetsState.status === "ready" &&
      assets.length === 0 &&
      visibleJobs.length === 0 ? (
        <p className="muted">No project files yet.</p>
      ) : null}

      {assets.length > 0 ? (
        <ul className="project-asset-list">
          {assets.map((asset) => {
            const rights = assetRightsLabel(asset);
            const busy = busyAssetId === asset.id;
            const removalIntent = removalIntents[asset.id];
            return (
              <li key={asset.id} className={rowClassName(asset)}>
                <div className="project-asset-main">
                  <div>
                    <strong>{asset.originalFilename}</strong>
                    <span className="muted">
                      {" "}
                      · {assetKindLabel(asset.assetKind)} ·{" "}
                      {assetDisplaySize(asset)}
                    </span>
                  </div>
                  <div className="project-asset-status">
                    <span className="project-asset-badge">
                      {assetStatusLabel(asset)}
                    </span>
                    {rights ? <span className="muted"> · {rights}</span> : null}
                  </div>
                </div>

                {needsRights(asset) ? (
                  <div className="project-asset-rights">
                    <p>
                      We found this file publicly, but we haven&apos;t assumed
                      you have permission to use it. Tell us whether it may be
                      used for this project.
                    </p>
                    <div className="button-row">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void decideRights(asset, "CONFIRM_PROJECT_USE")
                        }
                      >
                        Use for this project
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={busy}
                        onClick={() => void decideRights(asset, "DO_NOT_USE")}
                      >
                        Don&apos;t use
                      </button>
                    </div>
                  </div>
                ) : null}

                {asset.origin === "PUBLICLY_DISCOVERED" &&
                asset.rightsState === "DO_NOT_USE" ? (
                  <p className="muted">
                    You marked this file as don’t use for this project.
                  </p>
                ) : null}

                <div className="button-row">
                  {canOpen(asset) ? (
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => void handleOpen(asset)}
                    >
                      Open
                    </button>
                  ) : null}
                  {canRemove(asset) ? (
                    pendingRemoveId === asset.id ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void confirmRemove(asset)}
                        >
                          Confirm remove
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          disabled={busy}
                          onClick={() => setPendingRemoveId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="secondary"
                        disabled={busy}
                        onClick={() => setPendingRemoveId(asset.id)}
                      >
                        Remove
                      </button>
                    )
                  ) : null}
                  {asset.lifecycleState === "REMOVAL_PENDING" &&
                  removalIntent ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void retryRemoval(asset.id)}
                    >
                      Retry removal
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
