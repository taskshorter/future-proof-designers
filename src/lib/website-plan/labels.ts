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

/**
 * Translate Factory classifier rationale IDs into customer-safe copy.
 * Never fall back to rendering the raw rule identifier.
 */
export function packageRationaleMessage(
  category: WebsitePlanPackageCategory | null,
  rationale: string,
): string {
  const value = rationale.trim();

  if (value === "INSUFFICIENT" || category === null) {
    return "We need a little more information before recommending a package.";
  }

  if (value.startsWith("ESSENTIAL:")) {
    return "Your current needs fit a focused marketing website.";
  }

  if (value === "BUSINESS:module:booklocal") {
    return "Your plan includes scheduling needs that fit our Business Website scope.";
  }

  if (value === "BUSINESS:goals.multilingual") {
    return "Your multilingual requirements fit our Business Website scope.";
  }

  if (
    value.startsWith("BUSINESS:") &&
    (value.includes("locations") ||
      value.includes("offerings") ||
      value.includes("service_areas") ||
      value.includes("advanced_forms") ||
      value.includes("forms"))
  ) {
    return "Your business needs call for the broader capabilities of our Business Website.";
  }

  if (value.startsWith("BUSINESS:")) {
    return "Your business needs call for the broader capabilities of our Business Website.";
  }

  if (
    value.includes("ecommerce") ||
    value.includes("goals.ecommerce_present")
  ) {
    return "Your ecommerce requirements need custom scoping.";
  }

  if (
    value.includes("integrations") ||
    value.includes("goals.integrations_unproven")
  ) {
    return "Your requested integrations need custom scoping.";
  }

  if (value.startsWith("CUSTOM:")) {
    return "Some requested functionality needs custom scoping.";
  }

  switch (category) {
    case "ESSENTIAL":
      return "Your current needs fit a focused marketing website.";
    case "BUSINESS":
      return "Your business needs call for the broader capabilities of our Business Website.";
    case "CUSTOM":
      return "Some requested functionality needs custom scoping.";
    default:
      return "We need a little more information before recommending a package.";
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
  return "Website module";
}

export function assemblyStatusLabel(status: WebsitePlanAssemblyStatus): string {
  return status === "READY" ? "Ready for review" : "Needs more information";
}

const KNOWN_ATTENTION_MESSAGES: Record<string, string> = {
  MISSING_CRITICAL_FIELDS:
    "Some required business or goals information is still missing.",
  OWNER_ATTENTION_INSUFFICIENT_CLASSIFICATION:
    "Some requested capabilities need more clarity before a package can be confirmed.",
};

export function attentionMessage(flag: string): string {
  return (
    KNOWN_ATTENTION_MESSAGES[flag] ??
    "More project information is needed before this Website Plan can be confirmed."
  );
}

/**
 * Single customer-safe attention presentation layer.
 * Translates known internal flags, keeps genuine customer prose, and dedupes.
 */
export function customerAttentionMessages(
  customerSafeAttention: string[],
  classificationAttention: string[],
): string[] {
  const messages: string[] = [];
  const seen = new Set<string>();

  const push = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    messages.push(trimmed);
  };

  for (const item of customerSafeAttention) {
    if (Object.prototype.hasOwnProperty.call(KNOWN_ATTENTION_MESSAGES, item)) {
      push(KNOWN_ATTENTION_MESSAGES[item]!);
    } else if (/^[A-Z][A-Z0-9_]+$/.test(item)) {
      // Unknown internal-looking code — translate generically; never show raw.
      push(attentionMessage(item));
    } else {
      push(item);
    }
  }

  for (const flag of classificationAttention) {
    push(attentionMessage(flag));
  }

  return messages;
}

const FUNCTIONALITY_LABELS: Record<string, string> = {
  contact_form: "Contact form",
  contact: "Contact form",
  map: "Location map",
  gallery: "Image gallery",
  faq: "Frequently asked questions",
  testimonials: "Testimonials",
  hours: "Business hours",
  multi_page_marketing: "Multi-page marketing site",
  seo: "Search-engine basics",
  basic_seo: "Search-engine basics",
  advanced_forms: "Advanced lead form",
  multi_step_form: "Advanced lead form",
  lead_form: "Advanced lead form",
};

export function requiredFunctionalityLabel(token: string): string {
  return FUNCTIONALITY_LABELS[token] ?? "Additional website functionality";
}

/** Deduplicate equivalent display labels while preserving order. */
export function requiredFunctionalityLabels(tokens: string[]): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    const label = requiredFunctionalityLabel(token);
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels;
}
