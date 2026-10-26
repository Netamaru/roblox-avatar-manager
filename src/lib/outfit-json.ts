import { extractOutfitColors } from "@/lib/roblox-colors";
import { getErrorMessage } from "@/lib/error-message";
import {
  ArrangedOutfit,
  RobloxAsset,
  RobloxBodyColors,
  RobloxScale,
} from "@/types/roblox";

export interface ParsedOutfitCandidate {
  id?: number;
  name?: string;
  thumbnailUrl?: string;
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

    return {
      id: item.id || Math.floor(10000000 + Math.random() * 90000000),
      name: item.name || `Outfit #${idx + 1}`,
      thumbnailUrl: item.thumbnailUrl,
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
      },
    };
  });
}
