import { describe, expect, it } from "vitest";

import {
  MAX_CONCURRENT_UPLOADS,
  countActiveUploadJobs,
  pumpUploadQueue,
  selectNextQueuedJobs,
  type LocalUploadJob,
} from "./upload-queue";

function job(
  localId: string,
  phase: LocalUploadJob["phase"],
): LocalUploadJob {
  return {
    localId,
    file: new File(["x"], `${localId}.png`, { type: "image/png" }),
    uploadIntentOperationId: `00000000-0000-4000-8000-0000000000${localId.slice(-2)}`,
    uploadIntentCorrelationId: `00000000-0000-4000-8000-0000000001${localId.slice(-2)}`,
    completeOperationId: `00000000-0000-4000-8000-0000000002${localId.slice(-2)}`,
    completeCorrelationId: `00000000-0000-4000-8000-0000000003${localId.slice(-2)}`,
    phase,
  };
}

describe("upload queue concurrency", () => {
  it("selects at most three queued jobs when none are active", () => {
    const jobs = [1, 2, 3, 4, 5].map((n) => job(`j${n}`, "queued"));
    expect(selectNextQueuedJobs(jobs, MAX_CONCURRENT_UPLOADS)).toHaveLength(3);
    expect(countActiveUploadJobs(jobs)).toBe(0);
  });

  it("counts intent/uploading/completing as active", () => {
    const jobs = [
      job("a", "intent"),
      job("b", "uploading"),
      job("c", "completing"),
      job("d", "queued"),
      job("e", "failed"),
    ];
    expect(countActiveUploadJobs(jobs)).toBe(3);
    expect(selectNextQueuedJobs(jobs, 3)).toHaveLength(0);
  });

  it("pumpUploadQueue never starts more than 3 concurrently", async () => {
    let jobs: LocalUploadJob[] = [1, 2, 3, 4, 5].map((n) => job(`j${n}`, "queued"));
    let maxActive = 0;
    const deferreds: Array<{ resolve: () => void }> = [];

    const startJob = async (selected: LocalUploadJob) => {
      jobs = jobs.map((entry) =>
        entry.localId === selected.localId
          ? { ...entry, phase: "uploading" }
          : entry,
      );
      maxActive = Math.max(maxActive, countActiveUploadJobs(jobs));
      await new Promise<void>((resolve) => {
        deferreds.push({ resolve });
      });
      jobs = jobs.map((entry) =>
        entry.localId === selected.localId ? { ...entry, phase: "done" } : entry,
      );
    };

    const first = pumpUploadQueue({
      getJobs: () => jobs,
      setJobs: (updater) => {
        jobs = updater(jobs);
      },
      startJob,
      maxActive: 3,
    });

    // Allow microtasks to claim first batch.
    await Promise.resolve();
    await Promise.resolve();
    expect(countActiveUploadJobs(jobs)).toBeLessThanOrEqual(3);
    expect(maxActive).toBeLessThanOrEqual(3);

    // Resolve first wave.
    const firstWave = deferreds.splice(0, deferreds.length);
    firstWave.forEach((d) => d.resolve());
    await first;

    // Drain remaining.
    while (jobs.some((j) => j.phase === "queued")) {
      const more = pumpUploadQueue({
        getJobs: () => jobs,
        setJobs: (updater) => {
          jobs = updater(jobs);
        },
        startJob,
        maxActive: 3,
      });
      await Promise.resolve();
      expect(countActiveUploadJobs(jobs)).toBeLessThanOrEqual(3);
      maxActive = Math.max(maxActive, countActiveUploadJobs(jobs));
      deferreds.splice(0, deferreds.length).forEach((d) => d.resolve());
      await more;
    }

    expect(maxActive).toBeLessThanOrEqual(3);
    expect(jobs.every((j) => j.phase === "done")).toBe(true);
  });
});
