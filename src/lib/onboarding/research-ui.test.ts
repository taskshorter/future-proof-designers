import { describe, expect, it } from "vitest";

import type { ResearchCandidate, ResearchRun } from "@/lib/factory/contract";
import {
  formatCandidateValueForDisplay,
  groupPendingMappedCandidates,
  hasActiveResearch,
  isMappedCandidate,
  isSafeExternalHttpUrl,
  researchStatusLabel,
  unmappedPendingCandidates,
} from "./research-ui";

const run = (status: ResearchRun["status"]): ResearchRun => ({
  id: "00000000-0000-4000-8000-0000000000bb",
  kind: "INITIAL_WHOLE_SITE",
  status,
  normalizedUrl: null,
  failureClassification: null,
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
  startedAt: null,
  finishedAt: null,
});

const candidate = (
  overrides: Partial<ResearchCandidate> & Pick<ResearchCandidate, "id" | "fieldKey" | "extractedValue">,
): ResearchCandidate => ({
  researchRunId: "00000000-0000-4000-8000-0000000000bb",
  derivation: "DISCOVERED",
  disposition: "PENDING",
  advisoryConfidence: null,
  observedAt: "2026-04-01T00:00:00.000Z",
  sourceIds: [],
  ...overrides,
});

describe("research-ui helpers", () => {
  it("maps research statuses to display labels", () => {
    expect(researchStatusLabel("QUEUED")).toBe("Queued");
    expect(researchStatusLabel("RUNNING")).toBe("In progress");
    expect(researchStatusLabel("SUCCEEDED")).toBe("Complete");
    expect(researchStatusLabel("PARTIAL")).toBe("Completed with gaps");
    expect(researchStatusLabel("FAILED")).toBe("Unavailable");
  });

  it("detects active research for polling", () => {
    expect(hasActiveResearch([run("QUEUED")])).toBe(true);
    expect(hasActiveResearch([run("RUNNING")])).toBe(true);
    expect(hasActiveResearch([run("SUCCEEDED"), run("FAILED")])).toBe(false);
  });

  it("treats unknown field keys as unmapped", () => {
    expect(
      isMappedCandidate(
        candidate({
          id: "00000000-0000-4000-8000-000000000001",
          fieldKey: "business.name",
          extractedValue: "A",
        }),
      ),
    ).toBe(true);
    expect(
      isMappedCandidate(
        candidate({
          id: "00000000-0000-4000-8000-000000000002",
          fieldKey: null,
          extractedValue: "A",
        }),
      ),
    ).toBe(false);
    expect(
      isMappedCandidate(
        candidate({
          id: "00000000-0000-4000-8000-000000000003",
          fieldKey: "unknown.field",
          extractedValue: "A",
        }),
      ),
    ).toBe(false);
  });

  it("groups conflicting pending values without selecting one", () => {
    const groups = groupPendingMappedCandidates([
      candidate({
        id: "00000000-0000-4000-8000-000000000001",
        fieldKey: "business.name",
        extractedValue: "A",
        observedAt: "2026-04-01T00:00:01.000Z",
      }),
      candidate({
        id: "00000000-0000-4000-8000-000000000002",
        fieldKey: "business.name",
        extractedValue: "B",
        observedAt: "2026-04-01T00:00:02.000Z",
      }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.hasConflict).toBe(true);
    expect(groups[0]!.candidates.map((c) => c.extractedValue)).toEqual(["A", "B"]);
  });

  it("lists unmapped pending candidates", () => {
    const list = unmappedPendingCandidates([
      candidate({
        id: "00000000-0000-4000-8000-000000000001",
        fieldKey: null,
        extractedValue: "<script>x</script>",
      }),
      candidate({
        id: "00000000-0000-4000-8000-000000000002",
        fieldKey: "business.name",
        extractedValue: "Mapped",
      }),
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]!.fieldKey).toBeNull();
  });

  it("only treats http(s) as safe external URLs", () => {
    expect(isSafeExternalHttpUrl("https://example.com")).toBe(true);
    expect(isSafeExternalHttpUrl("http://example.com")).toBe(true);
    expect(isSafeExternalHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalHttpUrl("not a url")).toBe(false);
  });

  it("formats extracted values as plain text", () => {
    expect(formatCandidateValueForDisplay("<b>Hi</b>")).toBe("<b>Hi</b>");
    expect(formatCandidateValueForDisplay({ a: 1 })).toBe('{"a":1}');
  });
});
