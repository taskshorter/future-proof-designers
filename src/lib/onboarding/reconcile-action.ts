export const RECONCILE_RESEARCH_ACTIONS = ["accept", "edit", "reject"] as const;

export type ReconcileResearchAction = (typeof RECONCILE_RESEARCH_ACTIONS)[number];

export function isReconcileResearchAction(
  value: unknown,
): value is ReconcileResearchAction {
  return value === "accept" || value === "edit" || value === "reject";
}
