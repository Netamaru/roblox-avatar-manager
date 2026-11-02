import { extractOutfitColors } from "@/lib/roblox-colors";
import { getErrorMessage } from "@/lib/error-message";
import { isAvatarBackgroundAsset } from "@/lib/roblox-server";
import {
  ArrangedOutfit,
  ExportManifest,
  RobloxAsset,
  RobloxBodyColors,
  RobloxScale,
  RobloxUser,
} from "@/types/roblox";

const DEFAULT_SCALE: RobloxScale = {
  height: 1,
  width: 1,
  head: 1,
  depth: 1,
  proportion: 0,
  bodyType: 0,
};

export function buildOutfitExportEntry(
  outfit: ArrangedOutfit,
  orderIndex = 0,
): ExportManifest["outfits"][number] {
  const colors = extractOutfitColors(outfit.details || outfit);
  const assets = outfit.details?.assets || [];
  const bgAsset = assets.find(isAvatarBackgroundAsset);
  const background =
    outfit.details?.background ||
    (bgAsset
      ? {
          id: bgAsset.id,
          name: bgAsset.name,
          imageUrl: outfit.backgroundUrl,
        }
      : outfit.backgroundAssetId || outfit.backgroundUrl
        ? {
            id: outfit.backgroundAssetId || 0,
            imageUrl: outfit.backgroundUrl,
          }
        : undefined);

  return {
    id: outfit.id,
    name: outfit.name,
    playerAvatarType: outfit.details?.playerAvatarType || "R15",
    bodyColors: colors.bodyColors,
    bodyColor3s: colors.bodyColor3s,
    scale: outfit.details?.scale || DEFAULT_SCALE,
    assetIds: assets.map((a) => a.id),
    assets,
    thumbnailUrl: outfit.thumbnailUrl,
    background: background?.id ? background : undefined,
    backgroundAssetId: background?.id || outfit.backgroundAssetId,
    orderIndex,
  };
}

export function buildSingleOutfitExport(
  outfit: ArrangedOutfit,
  user?: RobloxUser | null,
): ExportManifest {
  return {
    version: "1.0.0",
    source: "Roblox Avatar Manager",
    exportedAt: new Date().toISOString(),
    user: {
      id: user?.id || 0,
      name: user?.name || "Anonymous",
      displayName: user?.displayName || "Player",
    },
    totalOutfits: 1,
    outfits: [buildOutfitExportEntry(outfit, 0)],
  };
}

export function outfitExportFilename(outfit: ArrangedOutfit): string {
  const slug =
    outfit.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "avatar";
  return `avatar-${outfit.id}-${slug}.json`;
}

export function downloadOutfitExportJson(
  outfit: ArrangedOutfit,
  user?: RobloxUser | null,
): void {
  const manifest = buildSingleOutfitExport(outfit, user);
  const blob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = outfitExportFilename(outfit);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ParsedOutfitCandidate {
  id?: number;
  name?: string;
  thumbnailUrl?: string;
  backgroundUrl?: string;
  background?: {
    id: number;
    name?: string;
    imageUrl?: string;
  };
  backgroundAssetId?: number;
  playerAvatarType?: string;
  bodyColors?: Partial<RobloxBodyColors>;
  bodyColor3s?: Record<string, string>;
  scale?: RobloxScale;
  assets?: RobloxAsset[];
  assetIds?: number[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assetIdOf(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (isRecord(value) && typeof value.id === "number") return value.id;
  return undefined;
}

export function toRobloxAsset(value: unknown): RobloxAsset | null {
  const id = assetIdOf(value);
  if (id === undefined) return null;
  if (typeof value === "number") {
    return {
      id,
      name: `Asset ${id}`,
      assetType: { id: 0, name: "Asset" },
    };
  }
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name : `Asset ${id}`;
  const assetType = isRecord(value.assetType)
    ? {
        id: typeof value.assetType.id === "number" ? value.assetType.id : 0,
        name: typeof value.assetType.name === "string" ? value.assetType.name : "Asset",
      }
    : { id: 0, name: "Asset" };
  return {
    id,
    name,
    assetType,
    meta: isRecord(value.meta) ? (value.meta as RobloxAsset["meta"]) : undefined,
  };
}

function detailsOf(item: Record<string, unknown>): Record<string, unknown> {
  return isRecord(item.details) ? item.details : item;
}

function assetsFromDetails(details: Record<string, unknown>): RobloxAsset[] {
  if (Array.isArray(details.assets) && details.assets.length > 0) {
    return details.assets
      .map(toRobloxAsset)
      .filter((asset): asset is RobloxAsset => asset !== null);
  }
  if (Array.isArray(details.assetIds) && details.assetIds.length > 0) {
    return details.assetIds
      .map(toRobloxAsset)
      .filter((asset): asset is RobloxAsset => asset !== null);
  }
  return [];
}

function extractOutfitList(parsed: unknown): unknown[] {
  if (isRecord(parsed) && Array.isArray(parsed.outfits)) return parsed.outfits;
  if (Array.isArray(parsed)) return parsed;
  if (isRecord(parsed)) return [parsed];
  throw new Error("Invalid JSON format. Expected an outfit object or array.");
}

export function parseOutfitCandidates(raw: string): {
  candidates: ParsedOutfitCandidate[];
  error: string | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { candidates: [], error: null };

  try {
    const parsed: unknown = JSON.parse(trimmed);
    const list = extractOutfitList(parsed);
    if (list.length === 0) {
      throw new Error("JSON does not contain any outfit data.");
    }

    const candidates = list.map((item, idx) => {
      const rec = isRecord(item) ? item : {};
      const details = detailsOf(rec);
      const assets = assetsFromDetails(details);
      const assetIds = Array.isArray(details.assetIds)
        ? details.assetIds.filter((id): id is number => typeof id === "number")
        : assets.map((asset) => asset.id);

      // Extract background if present
      let background: { id: number; name?: string; imageUrl?: string } | undefined;
      let backgroundAssetId: number | undefined;

      const rawBg = rec.background || details.background;
      if (isRecord(rawBg)) {
        const bgId = typeof rawBg.id === "number" ? rawBg.id : undefined;
        if (bgId) {
          background = {
            id: bgId,
            name: typeof rawBg.name === "string" ? rawBg.name : undefined,
            imageUrl: typeof rawBg.imageUrl === "string" ? rawBg.imageUrl : undefined,
          };
          backgroundAssetId = bgId;
        }
      } else if (typeof rec.backgroundAssetId === "number") {
        backgroundAssetId = rec.backgroundAssetId;
        background = { id: rec.backgroundAssetId };
      } else if (typeof details.backgroundAssetId === "number") {
        backgroundAssetId = details.backgroundAssetId as number;
        background = { id: details.backgroundAssetId as number };
      }

      // Check if assets already contains background asset, or if one in assets matches AvatarBackground
      const bgFromAssets = assets.find(isAvatarBackgroundAsset);
      if (bgFromAssets) {
        backgroundAssetId = bgFromAssets.id;
        if (!background) {
          background = {
            id: bgFromAssets.id,
            name: bgFromAssets.name,
          };
        }
      } else if (backgroundAssetId && !assets.some((a) => a.id === backgroundAssetId)) {
        // If backgroundAssetId was specified explicitly in JSON, ensure it is added to assets
        assets.push({
          id: backgroundAssetId,
          name: background?.name || `Background ${backgroundAssetId}`,
          assetType: { id: 92, name: "AvatarBackground" },
        });
        if (!assetIds.includes(backgroundAssetId)) {
          assetIds.push(backgroundAssetId);
        }
      }

      const backgroundUrl =
        background?.imageUrl ||
        (typeof rec.backgroundUrl === "string" ? rec.backgroundUrl : undefined) ||
        (typeof details.backgroundUrl === "string" ? details.backgroundUrl : undefined);

      if (background && backgroundUrl && !background.imageUrl) {
        background.imageUrl = backgroundUrl;
      }

      return {
        id:
          (typeof rec.id === "number" ? rec.id : undefined) ??
          (typeof details.id === "number" ? details.id : undefined),
        name:
          (typeof rec.name === "string" ? rec.name : undefined) ||
          (typeof details.name === "string" ? details.name : undefined) ||
          `Outfit #${idx + 1}`,
        thumbnailUrl:
          (typeof rec.thumbnailUrl === "string" ? rec.thumbnailUrl : undefined) ||
          (typeof details.thumbnailUrl === "string" ? details.thumbnailUrl : undefined),
        backgroundUrl,
        background,
        backgroundAssetId,
        playerAvatarType:
          (typeof details.playerAvatarType === "string"
            ? details.playerAvatarType
            : undefined) || "R15",
        bodyColors: isRecord(details.bodyColors)
          ? (details.bodyColors as Partial<RobloxBodyColors>)
          : undefined,
        bodyColor3s: isRecord(details.bodyColor3s)
          ? (details.bodyColor3s as Record<string, string>)
          : undefined,
        scale: isRecord(details.scale) ? (details.scale as unknown as RobloxScale) : undefined,
        assets: assets.length > 0 ? assets : undefined,
        assetIds,
      };
    });

    return { candidates, error: null };
  } catch (err) {
    return { candidates: [], error: getErrorMessage(err, "Failed to parse JSON.") };
  }
}

export function importOutfitsFromJson(raw: string): ArrangedOutfit[] {
  const { candidates, error } = parseOutfitCandidates(raw);
  if (error) throw new Error(error);

  return candidates.map((item, idx) => {
    const colors = extractOutfitColors(item);
    const assets =
      item.assets ??
      (item.assetIds ?? []).map((id) => ({
        id,
        name: `Asset ${id}`,
        assetType: { id: 0, name: "Asset" },
      }));

    const background =
      item.background ||
      (item.backgroundAssetId ? { id: item.backgroundAssetId } : undefined);
    const backgroundUrl = item.backgroundUrl || item.background?.imageUrl;

    return {
      id: item.id || Math.floor(10000000 + Math.random() * 90000000),
      name: item.name || `Outfit #${idx + 1}`,
      thumbnailUrl: item.thumbnailUrl,
      backgroundUrl,
      backgroundAssetId: item.backgroundAssetId || background?.id,
      originalIndex: idx,
      currentIndex: idx,
      isLoaded: true,
      details: {
        id: item.id ?? 0,
        name: item.name || `Outfit #${idx + 1}`,
        playerAvatarType: item.playerAvatarType || "R15",
        bodyColors: colors.bodyColors,
        bodyColor3s: colors.bodyColor3s,
        scale: item.scale || {
          height: 1,
          width: 1,
          head: 1,
          depth: 1,
          proportion: 0,
          bodyType: 0,
        },
        assets,
        background,
      },
    };
  });
}
