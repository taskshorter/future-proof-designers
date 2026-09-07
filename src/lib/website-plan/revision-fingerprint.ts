import type { WebsitePlanRevision } from "@/lib/factory/contract";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      const entry = record[key];
      if (entry === undefined) continue;
      sorted[key] = canonicalize(entry);
    }
    return sorted;
  }
  return value;
}

/** Deterministic fingerprint of a revision payload for retry identity binding. */
export function fingerprintWebsitePlanRevision(
  revision: WebsitePlanRevision,
): string {
  return JSON.stringify(canonicalize(revision));
}
