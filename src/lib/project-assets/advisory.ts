/** Advisory client-side allowlist only — Factory remains authoritative. */

export const ADVISORY_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

const MiB = 1024 * 1024;

const ADVISORY_SIZE_CAPS_BYTES: Record<string, number> = {
  "image/jpeg": 25 * MiB,
  "image/png": 25 * MiB,
  "image/webp": 25 * MiB,
  "image/gif": 25 * MiB,
  "application/pdf": 50 * MiB,
  "video/mp4": 250 * MiB,
  "video/webm": 250 * MiB,
  "video/quicktime": 250 * MiB,
};

export type AdvisoryFileCheck =
  | { ok: true }
  | { ok: false; message: string };

export function advisoryCheckSelectedFile(file: File): AdvisoryFileCheck {
  const contentType = file.type;
  if (
    !(ADVISORY_ALLOWED_CONTENT_TYPES as readonly string[]).includes(contentType)
  ) {
    return {
      ok: false,
      message:
        "That file type isn’t supported here. Choose a JPEG, PNG, WebP, GIF, PDF, MP4, WebM, or QuickTime file.",
    };
  }

  const cap = ADVISORY_SIZE_CAPS_BYTES[contentType];
  if (cap !== undefined && file.size > cap) {
    const mb = Math.round(cap / MiB);
    return {
      ok: false,
      message: `That file is larger than the ${mb} MB limit for this type. Choose a smaller file.`,
    };
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return {
      ok: false,
      message: "That file looks empty. Choose another file.",
    };
  }

  return { ok: true };
}

export function acceptAttributeForFileInput(): string {
  return ADVISORY_ALLOWED_CONTENT_TYPES.join(",");
}
