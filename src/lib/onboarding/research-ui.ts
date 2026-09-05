import type {
  OnboardingSectionKey,
  ProjectResearchState,
  ResearchCandidate,
  ResearchRun,
  ResearchSource,
} from "@/lib/factory/contract";
import { fieldByKey, fieldsForSection, SECTION_ORDER } from "@/lib/onboarding/field-ui";

export const RESEARCH_POLL_INTERVAL_MS = 5_000;

export type ResearchStatusLabel =
  | "Queued"
  | "In progress"
  | "Complete"
  | "Completed with gaps"
  | "Unavailable";

export function researchStatusLabel(
  status: ResearchRun["status"],
): ResearchStatusLabel {
  switch (status) {
    case "QUEUED":
      return "Queued";
    case "RUNNING":
      return "In progress";
    case "SUCCEEDED":
      return "Complete";
    case "PARTIAL":
      return "Completed with gaps";
    case "FAILED":
      return "Unavailable";
  }
}

export function isActiveResearchRun(status: ResearchRun["status"]): boolean {
  return status === "QUEUED" || status === "RUNNING";
}

export function hasActiveResearch(runs: ResearchRun[]): boolean {
  return runs.some((run) => isActiveResearchRun(run.status));
}

export function primaryResearchRun(runs: ResearchRun[]): ResearchRun | null {
  if (runs.length === 0) return null;
  return [...runs].sort((a, b) => {
    const aActive = isActiveResearchRun(a.status) ? 0 : 1;
    const bActive = isActiveResearchRun(b.status) ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id);
  })[0]!;
}

export function isMappedCandidate(candidate: ResearchCandidate): boolean {
  return (
    typeof candidate.fieldKey === "string" &&
    candidate.fieldKey.length > 0 &&
    fieldByKey(candidate.fieldKey) !== undefined
  );
}

export function sectionKeyForCandidate(
  candidate: ResearchCandidate,
): OnboardingSectionKey | null {
  if (!candidate.fieldKey) return null;
  return fieldByKey(candidate.fieldKey)?.sectionKey ?? null;
}

export function isSafeExternalHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function formatCandidateValueForDisplay(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function valuesConflictSemantically(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) !== JSON.stringify(b);
  } catch {
    return String(a) !== String(b);
  }
}

export type CandidateFieldGroup = {
  fieldKey: string;
  sectionKey: OnboardingSectionKey;
  label: string;
  candidates: ResearchCandidate[];
  hasConflict: boolean;
};

function sortCandidatesStable(candidates: ResearchCandidate[]): ResearchCandidate[] {
  return [...candidates].sort((a, b) => {
    const observed = a.observedAt.localeCompare(b.observedAt);
    if (observed !== 0) return observed;
    return a.id.localeCompare(b.id);
  });
}

export function groupPendingMappedCandidates(
  candidates: ResearchCandidate[],
  sectionFilter?: OnboardingSectionKey | "ALL" | "UNMAPPED",
): CandidateFieldGroup[] {
  const pendingMapped = candidates.filter(
    (candidate) => candidate.disposition === "PENDING" && isMappedCandidate(candidate),
  );

  const byField = new Map<string, ResearchCandidate[]>();
  for (const candidate of pendingMapped) {
    const fieldKey = candidate.fieldKey!;
    const sectionKey = sectionKeyForCandidate(candidate)!;
    if (sectionFilter && sectionFilter !== "ALL" && sectionFilter !== "UNMAPPED") {
      if (sectionKey !== sectionFilter) continue;
    }
    const list = byField.get(fieldKey) ?? [];
    list.push(candidate);
    byField.set(fieldKey, list);
  }

  const groups: CandidateFieldGroup[] = [];
  for (const sectionKey of SECTION_ORDER) {
    for (const field of fieldsForSection(sectionKey)) {
      const list = byField.get(field.fieldKey);
      if (!list || list.length === 0) continue;
      const sorted = sortCandidatesStable(list);
      const hasConflict =
        sorted.length > 1 &&
        sorted.some((candidate) =>
          valuesConflictSemantically(candidate.extractedValue, sorted[0]!.extractedValue),
        );
      groups.push({
        fieldKey: field.fieldKey,
        sectionKey,
        label: field.label,
        candidates: sorted,
        hasConflict,
      });
    }
  }
  return groups;
}

export function unmappedPendingCandidates(
  candidates: ResearchCandidate[],
): ResearchCandidate[] {
  return sortCandidatesStable(
    candidates.filter(
      (candidate) => candidate.disposition === "PENDING" && !isMappedCandidate(candidate),
    ),
  );
}

export function reviewedCandidates(
  candidates: ResearchCandidate[],
): ResearchCandidate[] {
  return sortCandidatesStable(
    candidates.filter((candidate) => candidate.disposition !== "PENDING"),
  );
}

export function sourcesForCandidate(
  candidate: ResearchCandidate,
  sources: ResearchSource[],
): ResearchSource[] {
  const byId = new Map(sources.map((source) => [source.id, source]));
  return candidate.sourceIds
    .map((id) => byId.get(id))
    .filter((source): source is ResearchSource => source !== undefined)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function emptyResearchState(projectId: string): ProjectResearchState {
  return {
    ok: true,
    projectId,
    runs: [],
    sources: [],
    candidates: [],
  };
}
