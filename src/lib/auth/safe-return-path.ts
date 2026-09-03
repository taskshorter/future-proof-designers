export const DEFAULT_RETURN_PATH = "/portal";

function isSafeInternalPath(value: string): boolean {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return false;
  }

  if (value.includes("\\") || value.includes("@")) {
    return false;
  }

  const lower = value.toLowerCase();
  if (lower.includes("http:") || lower.includes("https:")) {
    return false;
  }

  try {
    const url = new URL(value, "http://localhost");
    return url.origin === "http://localhost" && url.pathname.startsWith("/");
  } catch {
    return false;
  }
}

export function sanitizeInternalReturnPath(input: unknown): string {
  if (typeof input !== "string") {
    return DEFAULT_RETURN_PATH;
  }

  const trimmed = input.trim();
  if (!trimmed || !isSafeInternalPath(trimmed)) {
    return DEFAULT_RETURN_PATH;
  }

  const url = new URL(trimmed, "http://localhost");
  const path = `${url.pathname}${url.search}${url.hash}`;
  return path.length > 0 ? path : DEFAULT_RETURN_PATH;
}

export function buildSignInPath(nextPath: unknown): string {
  const safeNext = sanitizeInternalReturnPath(nextPath);
  return `/sign-in?next=${encodeURIComponent(safeNext)}`;
}
