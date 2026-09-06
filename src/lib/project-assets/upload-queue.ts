/**
 * Bounded concurrency for local upload jobs (max 3 active).
 * Pure helper — no network I/O.
 */

export const MAX_CONCURRENT_UPLOADS = 3;

export type UploadJobPhase =
  | "queued"
  | "intent"
  | "uploading"
  | "completing"
  | "done"
  | "failed";

export type LocalUploadJob = {
  localId: string;
  file: File;
  uploadIntentOperationId: string;
  uploadIntentCorrelationId: string;
  completeOperationId: string;
  completeCorrelationId: string;
  assetId?: string;
  expectedVersion?: number;
  phase: UploadJobPhase;
  message?: string;
};

export function countActiveUploadJobs(jobs: readonly LocalUploadJob[]): number {
  return jobs.filter(
    (job) =>
      job.phase === "intent" ||
      job.phase === "uploading" ||
      job.phase === "completing",
  ).length;
}

export function selectNextQueuedJobs(
  jobs: readonly LocalUploadJob[],
  maxActive: number = MAX_CONCURRENT_UPLOADS,
): LocalUploadJob[] {
  const active = countActiveUploadJobs(jobs);
  const slots = Math.max(0, maxActive - active);
  if (slots === 0) return [];
  return jobs.filter((job) => job.phase === "queued").slice(0, slots);
}

/**
 * Drive the queue: start up to `maxActive` jobs by transitioning queued → intent
 * via the provided starter. Starter must eventually settle the job phase.
 */
export async function pumpUploadQueue(input: {
  getJobs: () => readonly LocalUploadJob[];
  setJobs: (updater: (prev: LocalUploadJob[]) => LocalUploadJob[]) => void;
  startJob: (job: LocalUploadJob) => Promise<void>;
  maxActive?: number;
}): Promise<void> {
  const maxActive = input.maxActive ?? MAX_CONCURRENT_UPLOADS;
  const next = selectNextQueuedJobs(input.getJobs(), maxActive);
  await Promise.all(
    next.map(async (job) => {
      input.setJobs((prev) =>
        prev.map((entry) =>
          entry.localId === job.localId
            ? { ...entry, phase: "intent", message: undefined }
            : entry,
        ),
      );
      await input.startJob(job);
    }),
  );
}
