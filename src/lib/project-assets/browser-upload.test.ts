import { describe, expect, it, vi } from "vitest";

import { uploadFileToSignedCapability } from "./browser-upload";

describe("uploadFileToSignedCapability", () => {
  it("passes exact bucket, path, token, and File to uploadToSignedUrl", async () => {
    const uploadToSignedUrl = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ uploadToSignedUrl });
    const createClient = vi.fn().mockReturnValue({
      storage: { from },
    });

    const file = new File(["bytes"], "logo.png", { type: "image/png" });
    const result = await uploadFileToSignedCapability({
      file,
      upload: {
        provider: "SUPABASE",
        bucket: "fp-project-assets",
        path: "projects/p/a/object.bin",
        token: "signed-upload-token",
        expiresAt: null,
      },
      createClient: createClient as never,
    });

    expect(result).toEqual({ ok: true });
    expect(from).toHaveBeenCalledExactlyOnceWith("fp-project-assets");
    expect(uploadToSignedUrl).toHaveBeenCalledExactlyOnceWith(
      "projects/p/a/object.bin",
      "signed-upload-token",
      file,
    );
  });

  it("fails the job when Storage returns an error", async () => {
    const uploadToSignedUrl = vi
      .fn()
      .mockResolvedValue({ error: { message: "denied" } });
    const createClient = vi.fn().mockReturnValue({
      storage: { from: () => ({ uploadToSignedUrl }) },
    });

    const result = await uploadFileToSignedCapability({
      file: new File(["x"], "a.png", { type: "image/png" }),
      upload: {
        provider: "SUPABASE",
        bucket: "b",
        path: "p",
        token: "t",
        expiresAt: null,
      },
      createClient: createClient as never,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/failed/i);
    }
  });
});
