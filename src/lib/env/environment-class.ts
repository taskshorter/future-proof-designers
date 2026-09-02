export const ENVIRONMENT_CLASSES = ["local", "preview", "production"] as const;

export type EnvironmentClass = (typeof ENVIRONMENT_CLASSES)[number];

export const ENVIRONMENT_CLASS_LABELS: Record<EnvironmentClass, string> = {
  local: "LOCAL / DEVELOPMENT",
  preview: "PREVIEW / TEST",
  production: "PRODUCTION",
};
