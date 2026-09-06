"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ProjectAssetUploadCapability } from "@/lib/factory/contract";

export type BrowserSignedUploadResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Upload file bytes directly to the Factory-returned Supabase signed capability.
 * Uses exact bucket / path / token — never reconstructs paths or uses secrets.
 */
export async function uploadFileToSignedCapability(input: {
  file: File;
  upload: ProjectAssetUploadCapability;
  createClient?: typeof createSupabaseBrowserClient;
}): Promise<BrowserSignedUploadResult> {
  const { file, upload } = input;
  if (upload.provider !== "SUPABASE") {
    return { ok: false, message: "Unsupported upload provider." };
  }

  const createClient = input.createClient ?? createSupabaseBrowserClient;
  const supabase = createClient();

  try {
    const { error } = await supabase.storage
      .from(upload.bucket)
      .uploadToSignedUrl(upload.path, upload.token, file);

    if (error) {
      return {
        ok: false,
        message: "Upload to storage failed. Please try again.",
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "Upload to storage failed. Please try again.",
    };
  }
}
