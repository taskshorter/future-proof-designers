import type { OnboardingSectionKey } from "@/lib/factory/contract";

export type FieldEditorType =
  | "short_text"
  | "long_text"
  | "choice"
  | "string_list"
  | "url_list"
  | "structured_list"
  | "contact_object"
  | "hours_object";

export type StructuredItemField = {
  key: string;
  label: string;
  editor: "short_text" | "long_text" | "url";
  required?: boolean;
};

export type OnboardingFieldUi = {
  fieldKey: string;
  sectionKey: OnboardingSectionKey;
  label: string;
  helpText?: string;
  editor: FieldEditorType;
  removable: boolean;
  choices?: ReadonlyArray<{ value: string; label: string }>;
  itemFields?: ReadonlyArray<StructuredItemField>;
  adaptive?: "existing_site" | "brand_existing_style";
};

const BUSINESS_FIELDS: OnboardingFieldUi[] = [
  {
    fieldKey: "business.name",
    sectionKey: "BUSINESS",
    label: "Business name",
    helpText: "The public name customers should recognize.",
    editor: "short_text",
    removable: false,
  },
  {
    fieldKey: "business.how_business_works",
    sectionKey: "BUSINESS",
    label: "How the business works",
    editor: "long_text",
    removable: true,
  },
  {
    fieldKey: "business.offerings",
    sectionKey: "BUSINESS",
    label: "Offerings",
    editor: "structured_list",
    removable: true,
    itemFields: [
      { key: "name", label: "Offering name", editor: "short_text", required: true },
      { key: "notes", label: "Notes", editor: "long_text" },
    ],
  },
  {
    fieldKey: "business.typical_customers",
    sectionKey: "BUSINESS",
    label: "Typical customers",
    editor: "long_text",
    removable: true,
  },
  {
    fieldKey: "business.differentiators",
    sectionKey: "BUSINESS",
    label: "What sets you apart",
    editor: "long_text",
    removable: true,
  },
  {
    fieldKey: "business.how_customers_find_business",
    sectionKey: "BUSINESS",
    label: "How customers find you",
    editor: "string_list",
    removable: true,
  },
  {
    fieldKey: "business.customer_start_process",
    sectionKey: "BUSINESS",
    label: "How a customer starts working with you",
    editor: "long_text",
    removable: true,
  },
  {
    fieldKey: "business.locations",
    sectionKey: "BUSINESS",
    label: "Locations",
    editor: "structured_list",
    removable: true,
    itemFields: [
      { key: "label", label: "Label", editor: "short_text" },
      { key: "address", label: "Address", editor: "long_text" },
      { key: "notes", label: "Notes", editor: "long_text" },
    ],
  },
  {
    fieldKey: "business.service_areas",
    sectionKey: "BUSINESS",
    label: "Service areas",
    editor: "structured_list",
    removable: true,
    itemFields: [
      { key: "label", label: "Area", editor: "short_text", required: true },
      { key: "notes", label: "Notes", editor: "long_text" },
    ],
  },
  {
    fieldKey: "business.hours",
    sectionKey: "BUSINESS",
    label: "Hours",
    editor: "hours_object",
    removable: true,
  },
  {
    fieldKey: "business.public_contact",
    sectionKey: "BUSINESS",
    label: "Public contact",
    editor: "contact_object",
    removable: true,
  },
  {
    fieldKey: "business.social_links",
    sectionKey: "BUSINESS",
    label: "Social links",
    editor: "url_list",
    removable: true,
  },
  {
    fieldKey: "business.trust_signals",
    sectionKey: "BUSINESS",
    label: "Trust signals",
    editor: "structured_list",
    removable: true,
    itemFields: [
      { key: "kind", label: "Kind", editor: "short_text", required: true },
      { key: "summary", label: "Summary", editor: "long_text", required: true },
      { key: "url", label: "URL", editor: "url" },
    ],
  },
  {
    fieldKey: "business.public_staff",
    sectionKey: "BUSINESS",
    label: "Public staff",
    editor: "structured_list",
    removable: true,
    itemFields: [
      { key: "display_name", label: "Display name", editor: "short_text", required: true },
      { key: "role_title", label: "Role title", editor: "short_text" },
      { key: "bio", label: "Bio", editor: "long_text" },
    ],
  },
  {
    fieldKey: "business.pricing_information",
    sectionKey: "BUSINESS",
    label: "Pricing information",
    editor: "long_text",
    removable: true,
  },
];

const BRAND_FIELDS: OnboardingFieldUi[] = [
  {
    fieldKey: "brand.current_state",
    sectionKey: "BRAND",
    label: "Current brand state",
    editor: "choice",
    removable: true,
    choices: [
      { value: "established brand", label: "Established brand" },
      { value: "some existing brand elements", label: "Some existing brand elements" },
      { value: "starting fresh", label: "Starting fresh" },
    ],
  },
  {
    fieldKey: "brand.existing_colors_or_style",
    sectionKey: "BRAND",
    label: "Existing colors or style",
    editor: "long_text",
    removable: true,
    adaptive: "brand_existing_style",
  },
  {
    fieldKey: "brand.visual_direction",
    sectionKey: "BRAND",
    label: "Visual direction",
    editor: "string_list",
    removable: true,
  },
  {
    fieldKey: "brand.inspiration_links",
    sectionKey: "BRAND",
    label: "Inspiration links",
    editor: "url_list",
    removable: true,
  },
  {
    fieldKey: "brand.competitor_links",
    sectionKey: "BRAND",
    label: "Competitor links",
    editor: "url_list",
    removable: true,
  },
  {
    fieldKey: "brand.likes",
    sectionKey: "BRAND",
    label: "What you like",
    editor: "long_text",
    removable: true,
  },
  {
    fieldKey: "brand.dislikes",
    sectionKey: "BRAND",
    label: "What you dislike",
    editor: "long_text",
    removable: true,
  },
  {
    fieldKey: "brand.notes",
    sectionKey: "BRAND",
    label: "Brand notes",
    editor: "long_text",
    removable: true,
  },
];

const CONTENT_FIELDS: OnboardingFieldUi[] = [
  {
    fieldKey: "content.asset_inventory",
    sectionKey: "CONTENT",
    label: "Asset inventory",
    editor: "long_text",
    removable: true,
  },
  {
    fieldKey: "content.existing_copy",
    sectionKey: "CONTENT",
    label: "Existing copy",
    editor: "long_text",
    removable: true,
  },
  {
    fieldKey: "content.preserve_content",
    sectionKey: "CONTENT",
    label: "Content to preserve",
    editor: "long_text",
    removable: true,
  },
  {
    fieldKey: "content.imagery",
    sectionKey: "CONTENT",
    label: "Imagery",
    editor: "long_text",
    removable: true,
  },
  {
    fieldKey: "content.photography",
    sectionKey: "CONTENT",
    label: "Photography",
    editor: "long_text",
    removable: true,
  },
  {
    fieldKey: "content.document_links",
    sectionKey: "CONTENT",
    label: "Document links",
    editor: "url_list",
    removable: true,
  },
  {
    fieldKey: "content.video_links",
    sectionKey: "CONTENT",
    label: "Video links",
    editor: "url_list",
    removable: true,
  },
  {
    fieldKey: "content.notes",
    sectionKey: "CONTENT",
    label: "Content notes",
    editor: "long_text",
    removable: true,
  },
];

const GOALS_FIELDS: OnboardingFieldUi[] = [
  {
    fieldKey: "goals.additional_outcomes",
    sectionKey: "GOALS",
    label: "Additional outcomes",
    editor: "long_text",
    removable: true,
  },
  {
    fieldKey: "goals.customer_actions",
    sectionKey: "GOALS",
    label: "Actions you want customers to take",
    editor: "long_text",
    removable: true,
  },
  {
    fieldKey: "goals.required_features",
    sectionKey: "GOALS",
    label: "Required features",
    editor: "string_list",
    removable: true,
  },
  {
    fieldKey: "goals.integrations",
    sectionKey: "GOALS",
    label: "Integrations",
    editor: "string_list",
    removable: true,
  },
  {
    fieldKey: "goals.multilingual",
    sectionKey: "GOALS",
    label: "Multilingual needs",
    editor: "long_text",
    removable: true,
  },
  {
    fieldKey: "goals.ecommerce",
    sectionKey: "GOALS",
    label: "Ecommerce needs",
    editor: "long_text",
    removable: true,
  },
  {
    fieldKey: "goals.existing_site_keep_change",
    sectionKey: "GOALS",
    label: "What to keep or change from the existing site",
    editor: "long_text",
    removable: true,
    adaptive: "existing_site",
  },
  {
    fieldKey: "goals.constraints",
    sectionKey: "GOALS",
    label: "Constraints",
    editor: "long_text",
    removable: true,
  },
  {
    fieldKey: "goals.notes",
    sectionKey: "GOALS",
    label: "Goals notes",
    editor: "long_text",
    removable: true,
  },
];

const REVIEW_FIELDS: OnboardingFieldUi[] = [
  {
    fieldKey: "review.catch_all",
    sectionKey: "REVIEW",
    label: "Anything else we should know?",
    helpText: "Optional closing notes before you finish onboarding.",
    editor: "long_text",
    removable: true,
  },
];

export const ONBOARDING_FIELD_UI: ReadonlyArray<OnboardingFieldUi> = [
  ...BUSINESS_FIELDS,
  ...BRAND_FIELDS,
  ...CONTENT_FIELDS,
  ...GOALS_FIELDS,
  ...REVIEW_FIELDS,
];

export const SECTION_ORDER: ReadonlyArray<OnboardingSectionKey> = [
  "BUSINESS",
  "BRAND",
  "CONTENT",
  "GOALS",
  "REVIEW",
];

export const SECTION_LABELS: Record<OnboardingSectionKey, string> = {
  BUSINESS: "Business",
  BRAND: "Brand",
  CONTENT: "Content",
  GOALS: "Goals",
  REVIEW: "Review",
};

export const AUTOSAVE_DEBOUNCE_MS = 800;

export function fieldsForSection(sectionKey: OnboardingSectionKey): OnboardingFieldUi[] {
  return ONBOARDING_FIELD_UI.filter((field) => field.sectionKey === sectionKey);
}

export function fieldByKey(fieldKey: string): OnboardingFieldUi | undefined {
  return ONBOARDING_FIELD_UI.find((field) => field.fieldKey === fieldKey);
}

export function assertOnboardingFieldCatalog(): {
  total: number;
  counts: Record<OnboardingSectionKey, number>;
} {
  const counts = {
    BUSINESS: 0,
    BRAND: 0,
    CONTENT: 0,
    GOALS: 0,
    REVIEW: 0,
  } satisfies Record<OnboardingSectionKey, number>;
  const seen = new Set<string>();

  for (const field of ONBOARDING_FIELD_UI) {
    if (seen.has(field.fieldKey)) {
      throw new Error(`Duplicate onboarding field key: ${field.fieldKey}`);
    }
    seen.add(field.fieldKey);
    counts[field.sectionKey] += 1;
  }

  if (ONBOARDING_FIELD_UI.length !== 41) {
    throw new Error(`Expected 41 fields, found ${ONBOARDING_FIELD_UI.length}`);
  }
  if (counts.BUSINESS !== 15 || counts.BRAND !== 8 || counts.CONTENT !== 8) {
    throw new Error(`Unexpected section counts: ${JSON.stringify(counts)}`);
  }
  if (counts.GOALS !== 9 || counts.REVIEW !== 1) {
    throw new Error(`Unexpected section counts: ${JSON.stringify(counts)}`);
  }

  return { total: ONBOARDING_FIELD_UI.length, counts };
}

export function isFieldValueEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every((entry) =>
      isFieldValueEmpty(entry),
    );
  }
  return false;
}
