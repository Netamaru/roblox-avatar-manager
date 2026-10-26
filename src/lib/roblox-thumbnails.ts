/** Highest outfit thumbnail size Roblox documents (profile uses this). */
export const OUTFIT_THUMBNAIL_SIZE = "420x420";

/** High-res headshot so navbar / account chip stay sharp on retina. */
export const HEADSHOT_THUMBNAIL_SIZE = "420x420";

export function outfitThumbnailsApiUrl(outfitIds: number[]): string {
  return `https://thumbnails.roblox.com/v1/users/outfits?userOutfitIds=${outfitIds.join(",")}&size=${OUTFIT_THUMBNAIL_SIZE}&format=Png&isCircular=false`;
}

export function avatarHeadshotApiUrl(userId: number): string {
  return `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=${HEADSHOT_THUMBNAIL_SIZE}&format=Png&isCircular=false`;
}

/** Upgrade leftover 150px CDN paths (imports / cached outfits) to HD. */
export function hdThumbnailUrl(url: string): string {
  return url.replaceAll("/150/150/", "/420/420/");
}

export const ASSET_THUMBNAIL_SIZE = "150x150";

export function assetThumbnailsApiUrl(assetIds: number[]): string {
  return `https://thumbnails.roblox.com/v1/assets?assetIds=${assetIds.join(",")}&size=${ASSET_THUMBNAIL_SIZE}&format=Png&isCircular=false`;
}
