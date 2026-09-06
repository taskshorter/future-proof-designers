import type { ProjectAsset } from "@/lib/factory/contract";

export function formatByteSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${kib < 10 ? kib.toFixed(1) : Math.round(kib)} KB`;
  const mib = kib / 1024;
  return `${mib < 10 ? mib.toFixed(1) : Math.round(mib)} MB`;
}

export function assetDisplaySize(asset: ProjectAsset): string {
  return formatByteSize(asset.validatedByteSize ?? asset.declaredByteSize);
}

export function assetKindLabel(kind: ProjectAsset["assetKind"]): string {
  switch (kind) {
    case "IMAGE":
      return "Image";
    case "DOCUMENT":
      return "Document";
    case "VIDEO":
      return "Video";
    default:
      return "File";
  }
}

export function assetStatusLabel(asset: ProjectAsset): string {
  if (asset.lifecycleState === "PENDING_UPLOAD") return "Finishing upload";
  if (asset.lifecycleState === "REMOVAL_PENDING") return "Removing";
  if (asset.lifecycleState === "REMOVED") return "Removed";
  if (
    asset.lifecycleState === "FAILED" ||
    asset.validationState === "INVALID"
  ) {
    return "Couldn’t use this file";
  }
  if (
    asset.lifecycleState === "AVAILABLE" &&
    asset.validationState === "VALID"
  ) {
    return "Ready";
  }
  if (asset.lifecycleState === "AVAILABLE") return "Processing";
  return asset.lifecycleState;
}

export function assetRightsLabel(asset: ProjectAsset): string | null {
  if (asset.origin !== "PUBLICLY_DISCOVERED") return null;
  switch (asset.rightsState) {
    case "REUSE_RIGHTS_UNCONFIRMED":
      return "Needs your decision";
    case "CUSTOMER_CONFIRMED_PROJECT_USE":
      return "Approved for this project";
    case "DO_NOT_USE":
      return "Marked don’t use";
    default:
      return null;
  }
}
