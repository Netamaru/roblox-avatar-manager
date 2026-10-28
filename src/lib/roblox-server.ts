import { extractOutfitColors, normalizeBodyColor3s } from "@/lib/roblox-colors";
import { assetThumbnailsApiUrl, avatarHeadshotApiUrl, hdThumbnailUrl, outfitThumbnailsApiUrl } from "@/lib/roblox-thumbnails";
import {
  OutfitWritePayload,
  RobloxApiError,
  RobloxAsset,
  RobloxOutfitDetail,
  RobloxUser,
} from "@/types/roblox";

interface RobloxOutfitListItem {
  id: number;
  name: string;
  isEditable?: boolean;
  outfitType?: string | number;
}

interface ThumbnailItem {
  targetId?: number;
  state?: string;
  imageUrl?: string;
}

interface DevelopAssetItem {
  id?: number;
  isModerated?: boolean;
  moderationStatus?: string;
}

interface OutfitDetailsResponse {
  id?: number;
  name?: string;
  assets?: unknown[];
  bodyColors?: RobloxOutfitDetail["bodyColors"];
  bodyColor3s?: Record<string, string>;
  scale?: RobloxOutfitDetail["scale"];
  playerAvatarType?: string;
  isEditable?: boolean;
}

function toPatchAssets(assets: RobloxAsset[]): Array<{
  id: number;
  meta?: RobloxAsset["meta"];
}> {
  return assets.map((asset) => ({
    id: asset.id,
    ...(asset.meta
      ? { meta: { ...asset.meta, version: asset.meta.version || 1 } }
      : {}),
  }));
}

function parseRobloxErrors(errorText: string): RobloxApiError[] {
  try {
    const parsed = JSON.parse(errorText) as { errors?: RobloxApiError[] };
    return parsed.errors ?? [];
  } catch {
    return [];
  }
}

const ROBLOX_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export function cleanCookie(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith(".ROBLOSECURITY=")) {
    cleaned = cleaned.replace(".ROBLOSECURITY=", "");
  }
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.trim();
}

/**
 * Validates the .ROBLOSECURITY cookie and gets authenticated user details
 */
export async function getAuthenticatedUser(cookie: string): Promise<RobloxUser> {
  const sanitized = cleanCookie(cookie);
  const res = await fetch("https://users.roblox.com/v1/users/authenticated", {
    headers: {
      Cookie: `.ROBLOSECURITY=${sanitized}`,
      "User-Agent": ROBLOX_USER_AGENT,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Invalid or expired .ROBLOSECURITY cookie. Please get a fresh cookie from your browser.");
    }
    throw new Error(`Failed to verify user (HTTP ${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  const user: RobloxUser = {
    id: data.id,
    name: data.name,
    displayName: data.displayName,
  };

  try {
    const thumbRes = await fetch(
      avatarHeadshotApiUrl(user.id),
      { cache: "no-store" }
    );
    if (thumbRes.ok) {
      const thumbData = await thumbRes.json();
      if (thumbData.data && thumbData.data.length > 0 && thumbData.data[0].imageUrl) {
        user.avatarUrl = hdThumbnailUrl(thumbData.data[0].imageUrl);
      }
    }
  } catch (err) {
    console.warn("Could not fetch user avatar headshot", err);
  }

  return user;
}

/**
 * Fetches all saved outfits for a user (handles pagination)
 */
export async function getUserOutfits(cookie: string, userId: number) {
  const sanitized = cleanCookie(cookie);
  const outfits: Array<{ id: number; name: string; isEditable?: boolean; outfitType?: string | number }> = [];
  let page = 1;
  const itemsPerPage = 50;
  let hasMore = true;

  while (hasMore && page <= 10) {
    const res = await fetch(
      `https://avatar.roblox.com/v1/users/${userId}/outfits?page=${page}&itemsPerPage=${itemsPerPage}&isEditable=true`,
      {
        headers: {
          Cookie: `.ROBLOSECURITY=${sanitized}`,
          "User-Agent": ROBLOX_USER_AGENT,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch outfits (HTTP ${res.status}): ${res.statusText}`);
    }

    const json = (await res.json()) as { data?: RobloxOutfitListItem[] };
    const list = json.data || [];

    // Strictly filter to ONLY user-created saved avatar outfits
    const userCreatedOutfits = list.filter((item) => {
      // Must be editable (excludes purchased packages, catalog bundles, and preset avatar items)
      if (item.isEditable !== true) return false;
      // Must be an avatar outfit (excludes dynamic heads, shoes, makeup items, etc.)
      if (item.outfitType !== undefined && item.outfitType !== null) {
        if (item.outfitType !== "Avatar" && item.outfitType !== 2) return false;
      }
      return true;
    });

    outfits.push(...userCreatedOutfits);

    if (list.length < itemsPerPage) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return outfits;
}

/**
 * Fetches thumbnails for a list of outfit IDs
 */
export async function getOutfitThumbnails(outfitIds: number[]) {
  if (outfitIds.length === 0) return {};
  const thumbnailMap: Record<number, string> = {};
  const batchSize = 50;

  for (let i = 0; i < outfitIds.length; i += batchSize) {
    const batch = outfitIds.slice(i, i + batchSize);
    try {
      const url = outfitThumbnailsApiUrl(batch);
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { data?: ThumbnailItem[] };
        const data = json.data || [];
        for (const item of data) {
          if (item.targetId && item.imageUrl) {
            thumbnailMap[item.targetId] = hdThumbnailUrl(item.imageUrl);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch thumbnail batch", err);
    }
  }

  return thumbnailMap;
}

export async function getAssetThumbnails(assetIds: number[]) {
  if (assetIds.length === 0) return {};
  const thumbnailMap: Record<number, string> = {};
  const batchSize = 50;

  for (let i = 0; i < assetIds.length; i += batchSize) {
    const batch = assetIds.slice(i, i + batchSize);
    try {
      const res = await fetch(assetThumbnailsApiUrl(batch), { cache: "no-store" });
      if (!res.ok) continue;
      const json = (await res.json()) as { data?: ThumbnailItem[] };
      for (const item of json.data || []) {
        if (item.targetId && item.imageUrl) {
          thumbnailMap[item.targetId] = item.imageUrl;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch asset thumbnail batch", err);
    }
  }

  return thumbnailMap;
}

// In-memory cache with TTL for asset ownership & moderation checks to avoid repeat calls within a batch
// while still detecting newly deleted/moderated assets upon reload.
const ASSET_CHECK_CACHE_TTL_MS = 60_000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const ownershipCache = new Map<string, CacheEntry<boolean>>();
const ownershipInFlight = new Map<string, Promise<boolean>>();
const moderationCache = new Map<number, CacheEntry<boolean>>();

function getCachedValue<K, V>(cache: Map<K, CacheEntry<V>>, key: K): V | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCachedValue<K, V>(cache: Map<K, CacheEntry<V>>, key: K, value: V): void {
  cache.set(key, { value, expiresAt: Date.now() + ASSET_CHECK_CACHE_TTL_MS });
}

function isDevelopAssetModerated(item: DevelopAssetItem | undefined): boolean {
  if (!item) return true;
  if (item.isModerated === true) return true;
  if (
    typeof item.moderationStatus === "string" &&
    item.moderationStatus !== "Green" &&
    item.moderationStatus !== "Approved"
  ) {
    return true;
  }
  return false;
}

/**
 * Checks whether assets have been moderated or deleted by Roblox.
 * Even when Roblox deletes an item, the user may still own the inventory record (`is-owned === true`)
 * until a refund is processed, so we must also check asset moderation status via `develop.roblox.com`
 * (with fallback to `thumbnails.roblox.com` blocked state).
 */
export async function checkAssetsModeration(
  cookie: string,
  assetIds: number[]
): Promise<Map<number, boolean>> {
  const result = new Map<number, boolean>();
  const uncachedIds: number[] = [];

  for (const id of assetIds) {
    const cached = getCachedValue(moderationCache, id);
    if (cached !== undefined) {
      result.set(id, cached);
    } else if (!uncachedIds.includes(id)) {
      uncachedIds.push(id);
    }
  }

  if (uncachedIds.length === 0) {
    return result;
  }

  const sanitized = cleanCookie(cookie);
  const batchSize = 50;

  for (let i = 0; i < uncachedIds.length; i += batchSize) {
    const batch = uncachedIds.slice(i, i + batchSize);
    let handledByDevelop = false;

    try {
      const res = await fetch(
        `https://develop.roblox.com/v1/assets?assetIds=${batch.join(",")}`,
        {
          headers: {
            Cookie: `.ROBLOSECURITY=${sanitized}`,
            "User-Agent": ROBLOX_USER_AGENT,
          },
          cache: "no-store",
        }
      );

      if (res.ok) {
        const json = (await res.json()) as { data?: DevelopAssetItem[] };
        if (Array.isArray(json.data)) {
          handledByDevelop = true;
          const byId = new Map<number, DevelopAssetItem>();
          for (const item of json.data) {
            if (typeof item.id === "number") {
              byId.set(item.id, item);
            }
          }
          for (const id of batch) {
            const moderated = isDevelopAssetModerated(byId.get(id));
            setCachedValue(moderationCache, id, moderated);
            result.set(id, moderated);
          }
        }
      }
    } catch {
      // Fallback to thumbnail state check below
    }

    if (!handledByDevelop) {
      try {
        const thumbRes = await fetch(assetThumbnailsApiUrl(batch), { cache: "no-store" });
        if (thumbRes.ok) {
          const thumbJson = (await thumbRes.json()) as { data?: ThumbnailItem[] };
          const byId = new Map<number, ThumbnailItem>();
          for (const item of thumbJson.data || []) {
            if (typeof item.targetId === "number") {
              byId.set(item.targetId, item);
            }
          }
          for (const id of batch) {
            const thumb = byId.get(id);
            const blocked =
              thumb?.state === "Blocked" ||
              Boolean(thumb?.imageUrl?.includes("/UnapprovedImage/"));
            setCachedValue(moderationCache, id, blocked);
            result.set(id, blocked);
          }
        }
      } catch {
        // Ignore fallback failure
      }
    }
  }

  return result;
}

export async function checkAssetOwnership(
  cookie: string,
  userId: number,
  assetId: number
): Promise<boolean> {
  const cacheKey = `${userId}:${assetId}`;
  const cached = getCachedValue(ownershipCache, cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const existingPromise = ownershipInFlight.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const requestPromise = (async () => {
    try {
      const res = await fetch(
        `https://inventory.roblox.com/v1/users/${userId}/items/0/${assetId}/is-owned`,
        {
          headers: {
            Cookie: `.ROBLOSECURITY=${cleanCookie(cookie)}`,
            "User-Agent": ROBLOX_USER_AGENT,
          },
          cache: "no-store",
        }
      );
      if (!res.ok) {
        return true;
      }
      const text = (await res.text()).trim();
      const isOwned = text === "true";
      setCachedValue(ownershipCache, cacheKey, isOwned);
      return isOwned;
    } catch {
      return true;
    } finally {
      ownershipInFlight.delete(cacheKey);
    }
  })();

  ownershipInFlight.set(cacheKey, requestPromise);
  return requestPromise;
}

/**
 * Fetches full details for a specific outfit and verifies asset ownership
 */
export async function getOutfitDetails(
  cookie: string,
  outfitId: number,
  userId?: number
): Promise<RobloxOutfitDetail> {
  const sanitized = cleanCookie(cookie);

  // Fetch v3 (for full accessory meta like position/rotation/scale and bodyColor3s)
  // and v1 (for brickColor bodyColors) in parallel
  const [v3Res, v1Res] = await Promise.all([
    fetch(`https://avatar.roblox.com/v3/outfits/${outfitId}/details`, {
      headers: {
        Cookie: `.ROBLOSECURITY=${sanitized}`,
        "User-Agent": ROBLOX_USER_AGENT,
      },
      cache: "no-store",
    }).catch(() => null),
    fetch(`https://avatar.roblox.com/v1/outfits/${outfitId}/details`, {
      headers: {
        Cookie: `.ROBLOSECURITY=${sanitized}`,
        "User-Agent": ROBLOX_USER_AGENT,
      },
      cache: "no-store",
    }).catch(() => null),
  ]);

  const v3Data: OutfitDetailsResponse | null =
    v3Res && v3Res.ok ? ((await v3Res.json()) as OutfitDetailsResponse) : null;
  const v1Data: OutfitDetailsResponse | null =
    v1Res && v1Res.ok ? ((await v1Res.json()) as OutfitDetailsResponse) : null;

  if (!v3Data && !v1Data) {
    throw new Error(`Failed to fetch outfit details for outfit #${outfitId}`);
  }

  const base = v3Data ?? v1Data;
  if (!base) {
    throw new Error(`Failed to fetch outfit details for outfit #${outfitId}`);
  }
  const rawAssets = v3Data?.assets || v1Data?.assets || [];
  const assets: RobloxAsset[] = [];
  for (const asset of rawAssets) {
    if (typeof asset !== "object" || asset === null) continue;
    const rec = asset as {
      id?: number;
      name?: string;
      assetType?: RobloxAsset["assetType"];
      meta?: RobloxAsset["meta"];
    };
    if (typeof rec.id !== "number") continue;
    assets.push({
      id: rec.id,
      name: rec.name || `Asset ${rec.id}`,
      assetType: rec.assetType || { id: 0, name: "Asset" },
      ...(rec.meta ? { meta: rec.meta } : {}),
    });
  }

  // Resolve user ID for ownership check
  let currentUserId = userId;
  if (!currentUserId) {
    try {
      const u = await getAuthenticatedUser(sanitized);
      currentUserId = u.id;
    } catch {
      // ignore
    }
  }

  // Check moderation status & ownership of assets in parallel with cache
  const missingAssetIds: number[] = [];
  if (assets.length > 0) {
    const moderatedMap = await checkAssetsModeration(
      sanitized,
      assets.map((a) => a.id)
    );

    await Promise.all(
      assets.map(async (asset) => {
        const isModerated = moderatedMap.get(asset.id) === true;
        if (isModerated) {
          asset.isOwned = false;
          missingAssetIds.push(asset.id);
          return;
        }

        if (currentUserId) {
          const isOwned = await checkAssetOwnership(sanitized, currentUserId, asset.id);
          asset.isOwned = isOwned;
          if (!isOwned) {
            missingAssetIds.push(asset.id);
          }
        } else {
          asset.isOwned = true;
        }
      })
    );
  }

  const { bodyColors, bodyColor3s } = extractOutfitColors({
    bodyColors: v1Data?.bodyColors,
    bodyColor3s: v3Data?.bodyColor3s,
  });

  return {
    id: base.id ?? outfitId,
    name: base.name ?? `Outfit #${outfitId}`,
    assets,
    missingAssetIds: missingAssetIds.length > 0 ? missingAssetIds : undefined,
    bodyColors,
    bodyColor3s,
    scale: base.scale || {
      height: 1,
      width: 1,
      head: 1,
      depth: 1,
      proportion: 0,
      bodyType: 0,
    },
    playerAvatarType: base.playerAvatarType || "R15",
    isEditable: base.isEditable,
  };
}

/**
 * Fetches a fresh x-csrf-token from Roblox
 */
export async function getCsrfToken(cookie: string): Promise<string> {
  const sanitized = cleanCookie(cookie);
  const res = await fetch("https://auth.roblox.com/v2/login", {
    method: "POST",
    headers: {
      Cookie: `.ROBLOSECURITY=${sanitized}`,
      "User-Agent": ROBLOX_USER_AGENT,
    },
    cache: "no-store",
  });

  const csrf = res.headers.get("x-csrf-token");
  if (!csrf) {
    throw new Error("Failed to retrieve x-csrf-token from Roblox.");
  }
  return csrf;
}

/**
 * Deletes an outfit by userOutfitId
 */
export async function deleteOutfit(cookie: string, outfitId: number, csrfToken?: string) {
  const sanitized = cleanCookie(cookie);
  let token = csrfToken || (await getCsrfToken(sanitized));

  let res = await fetch(`https://avatar.roblox.com/v1/outfits/${outfitId}/delete`, {
    method: "POST",
    headers: {
      Cookie: `.ROBLOSECURITY=${sanitized}`,
      "x-csrf-token": token,
      "Content-Type": "application/json",
      "User-Agent": ROBLOX_USER_AGENT,
    },
    body: JSON.stringify({}),
  });

  if (res.status === 403 && res.headers.get("x-csrf-token")) {
    token = res.headers.get("x-csrf-token")!;
    res = await fetch(`https://avatar.roblox.com/v1/outfits/${outfitId}/delete`, {
      method: "POST",
      headers: {
        Cookie: `.ROBLOSECURITY=${sanitized}`,
        "x-csrf-token": token,
        "Content-Type": "application/json",
        "User-Agent": ROBLOX_USER_AGENT,
      },
      body: JSON.stringify({}),
    });
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    const isAlreadyDeleted =
      res.status === 404 ||
      (res.status === 400 &&
        (errorText.toLowerCase().includes("does not exist") ||
          errorText.toLowerCase().includes("not found")));
    if (isAlreadyDeleted) {
      return { success: true, newCsrfToken: token, alreadyDeleted: true };
    }
    throw new Error(`Failed to delete outfit #${outfitId} (HTTP ${res.status}): ${errorText || res.statusText}`);
  }

  return { success: true, newCsrfToken: token, alreadyDeleted: false };
}

/**
 * Creates an outfit using Roblox Avatar API
 */
export async function createOutfit(
  cookie: string,
  payload: OutfitWritePayload & { assetIds: number[]; scale: NonNullable<OutfitWritePayload["scale"]>; playerAvatarType: string },
  csrfToken?: string
) {
  const sanitized = cleanCookie(cookie);
  let token = csrfToken || (await getCsrfToken(sanitized));
  const user = await getAuthenticatedUser(sanitized);

  // Step 1: Create new outfit container on Roblox via v4
  let createRes = await fetch("https://avatar.roblox.com/v4/outfits/create", {
    method: "POST",
    headers: {
      Cookie: `.ROBLOSECURITY=${sanitized}`,
      "x-csrf-token": token,
      "Content-Type": "application/json",
      "User-Agent": ROBLOX_USER_AGENT,
    },
    body: JSON.stringify({ outfitType: "Avatar" }),
  });

  if (createRes.status === 403 && createRes.headers.get("x-csrf-token")) {
    token = createRes.headers.get("x-csrf-token")!;
    createRes = await fetch("https://avatar.roblox.com/v4/outfits/create", {
      method: "POST",
      headers: {
        Cookie: `.ROBLOSECURITY=${sanitized}`,
        "x-csrf-token": token,
        "Content-Type": "application/json",
        "User-Agent": ROBLOX_USER_AGENT,
      },
      body: JSON.stringify({ outfitType: "Avatar" }),
    });
  }

  if (!createRes.ok) {
    const errorBody = await createRes.text().catch(() => "");
    throw new Error(`Failed to create outfit container (HTTP ${createRes.status}): ${errorBody}`);
  }

  // Step 2: Retrieve newly created outfit ID
  const listRes = await fetch(
    `https://avatar.roblox.com/v1/users/${user.id}/outfits?page=1&itemsPerPage=1&isEditable=true`,
    {
      headers: {
        Cookie: `.ROBLOSECURITY=${sanitized}`,
        "User-Agent": ROBLOX_USER_AGENT,
      },
      cache: "no-store",
    }
  );
  if (!listRes.ok) {
    throw new Error(`Failed to retrieve newly created outfit ID (HTTP ${listRes.status})`);
  }
  const listJson = (await listRes.json()) as { data?: RobloxOutfitListItem[] };
  const createdOutfit = listJson.data?.[0];
  if (!createdOutfit?.id) {
    throw new Error("Newly created outfit not found in user outfits list.");
  }

  const newOutfitId = createdOutfit.id;

  // Step 3: PATCH via v3/outfits/{newOutfitId} with complete metadata, coordinates, and skin colors
  const patchResult = await patchOutfit(cookie, newOutfitId, payload, token);
  return {
    ...patchResult,
    data: {
      id: newOutfitId,
      ...patchResult.data,
    },
  };
}

/**
 * Patches an existing outfit on Roblox using Avatar v3 API with automatic retries for moderated names,
 * deleted/unwearable assets, and csrf expiration.
 */
export async function patchOutfit(
  cookie: string,
  outfitId: number,
  payload: OutfitWritePayload,
  csrfToken?: string
) {
  const sanitized = cleanCookie(cookie);
  let token = csrfToken || (await getCsrfToken(sanitized));

  const removedAssets: number[] = [];
  let currentAssets: Array<{ id: number; meta?: RobloxAsset["meta"] }>;

  if (payload.assets && payload.assets.length > 0) {
    const validAssets: RobloxAsset[] = [];
    for (const asset of payload.assets) {
      if (asset.isOwned === false) {
        removedAssets.push(asset.id);
      } else {
        validAssets.push(asset);
      }
    }
    currentAssets = toPatchAssets(validAssets);
  } else {
    currentAssets = (payload.assetIds || []).map((id) => ({ id }));
  }

  let patchRes: Response | null = null;
  let currentOutfitName = payload.name?.trim() || "Avatar";
  let wasNameReset = false;
  let maxRetries = 10;

  const finalBodyColor3s = normalizeBodyColor3s(payload.bodyColor3s, payload.bodyColors);

  while (maxRetries > 0) {
    maxRetries--;

    const patchBody = {
      name: currentOutfitName,
      playerAvatarType: payload.playerAvatarType || "R15",
      scale: payload.scale || {
        height: 1,
        width: 1,
        head: 1,
        depth: 1,
        proportion: 0,
        bodyType: 0,
      },
      assets: currentAssets,
      bodyColor3s: finalBodyColor3s,
    };

    patchRes = await fetch(`https://avatar.roblox.com/v3/outfits/${outfitId}`, {
      method: "PATCH",
      headers: {
        Cookie: `.ROBLOSECURITY=${sanitized}`,
        "x-csrf-token": token,
        "Content-Type": "application/json",
        "User-Agent": ROBLOX_USER_AGENT,
      },
      body: JSON.stringify(patchBody),
    });

    if (patchRes.status === 403 && patchRes.headers.get("x-csrf-token")) {
      token = patchRes.headers.get("x-csrf-token")!;
      patchRes = await fetch(`https://avatar.roblox.com/v3/outfits/${outfitId}`, {
        method: "PATCH",
        headers: {
          Cookie: `.ROBLOSECURITY=${sanitized}`,
          "x-csrf-token": token,
          "Content-Type": "application/json",
          "User-Agent": ROBLOX_USER_AGENT,
        },
        body: JSON.stringify(patchBody),
      });
    }

    if (patchRes.ok) {
      break;
    }

    const errorText = await patchRes.text().catch(() => "");
    const errors = parseRobloxErrors(errorText);

    // Check if error is due to an invalid / moderated outfit name (Roblox error code 4)
    const invalidNameError = errors.find(
      (e) =>
        e.code === 4 ||
        e.message?.toLowerCase().includes("invalid outfit name") ||
        e.message?.toLowerCase().includes("name is invalid")
    );

    if (invalidNameError && currentOutfitName !== "Avatar") {
      currentOutfitName = "Avatar";
      wasNameReset = true;
      continue; // Retry with safe default name "Avatar"
    }

    // Check if error is due to an unwearable / deleted asset (Roblox error code 5)
    const unwearableError = errors.find(
      (e) => e.code === 5 || e.message?.toLowerCase().includes("not wearable")
    );

    if (unwearableError && unwearableError.fieldData) {
      const badAssetId = Number(unwearableError.fieldData);
      if (!isNaN(badAssetId) && currentAssets.some((a) => a.id === badAssetId)) {
        removedAssets.push(badAssetId);
        currentAssets = currentAssets.filter((a) => a.id !== badAssetId);
        continue; // Retry with bad asset excluded
      }
    }

    throw new Error(
      `Failed to update outfit #${outfitId} with details (HTTP ${patchRes.status}): ${errorText}`
    );
  }

  if (!patchRes || !patchRes.ok) {
    throw new Error(`Failed to update outfit #${outfitId} after retrying.`);
  }

  const patchJson = await patchRes.json().catch(() => ({}));
  return {
    success: true,
    newCsrfToken: token,
    removedAssets: removedAssets.length > 0 ? removedAssets : undefined,
    renamedToDefault: wasNameReset || undefined,
    data: {
      id: outfitId,
      name: currentOutfitName,
      ...patchJson,
    },
  };
}
