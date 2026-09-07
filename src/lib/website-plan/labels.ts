import type {
  WebsitePlanAssemblyStatus,
  WebsitePlanModuleInclusion,
  WebsitePlanPackageCategory,
  WebsitePlanPageOrigin,
} from "@/lib/factory/contract";

export function packageCategoryLabel(
  category: WebsitePlanPackageCategory | null,
): string {
  switch (category) {
    case "ESSENTIAL":
      return "Essential Website";
    case "BUSINESS":
      return "Business Website";
    case "CUSTOM":
      return "Custom Website";
    default:
      return "Website Plan needs more information";
  }
}

export function pageOriginLabel(origin: WebsitePlanPageOrigin): string {
  switch (origin) {
    case "FP_RECOMMENDED":
      return "Recommended for your website";
    case "CUSTOMER_ADDED":
      return "Added by you";
    case "CUSTOMER_REMOVED_FROM_RECOMMENDATION":
      return "Removed from recommendation";
  }
}

export function moduleInclusionLabel(
  inclusion: WebsitePlanModuleInclusion,
): string {
  switch (inclusion) {
    case "RECOMMENDED":
      return "Recommended";
    case "INCLUDED":
      return "Included";
    case "DECLINED_BY_CUSTOMER":
      return "Declined";
  }
}

export function moduleKeyLabel(moduleKey: string): string {
  if (moduleKey === "booklocal") {
    return "BookLocal scheduling";
  }
  return moduleKey;
}

export function assemblyStatusLabel(status: WebsitePlanAssemblyStatus): string {
  return status === "READY" ? "Ready for review" : "Needs more information";
}

export function attentionMessage(flag: string): string {
  switch (flag) {
    case "MISSING_CRITICAL_FIELDS":
      return "Some required business or goals information is still missing.";
    case "OWNER_ATTENTION_INSUFFICIENT_CLASSIFICATION":
      return "Some requested capabilities need more clarity before a package can be confirmed.";
    default:
      return "More project information is needed before this Website Plan can be confirmed.";
  }
}
