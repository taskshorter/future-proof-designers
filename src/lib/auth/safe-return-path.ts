export const DEFAULT_RETURN_PATH = "/portal";

const ALLOWED_DESTINATION =
  /^\/(?:portal(?:\/projects\/[^/]+(?:\/onboarding)?)?|start)(?:[?#][^/\\@]*)?$/;

function rejectsRawInput(value: string): boolean {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return true;
  }

  if (value.includes("\\") || value.includes("@")) {
    return true;
  }

  const lower = value.toLowerCase();
  return lower.includes("http:") || lower.includes("https:");
}

function isNormalizedPathSafe(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return false;
  }

  if (path.includes("\\") || path.includes("@")) {
    return false;
  }

  const lower = path.toLowerCase();
  if (lower.includes("http:") || lower.includes("https:")) {
    return false;
  }

  return ALLOWED_DESTINATION.test(path);
}

export function sanitizeInternalReturnPath(input: unknown): string {
  if (typeof input !== "string") {
    return DEFAULT_RETURN_PATH;
  }

  const trimmed = input.trim();
  if (!trimmed || rejectsRawInput(trimmed)) {
    return DEFAULT_RETURN_PATH;
  }

  let path: string;
  try {
    const url = new URL(trimmed, "http://localhost");
    path = `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_RETURN_PATH;
  }

  if (!path || !isNormalizedPathSafe(path)) {
    return DEFAULT_RETURN_PATH;
  }

  return path;
}

export function buildSignInPath(nextPath: unknown): string {
  const safeNext = sanitizeInternalReturnPath(nextPath);
  return `/sign-in?next=${encodeURIComponent(safeNext)}`;
}
