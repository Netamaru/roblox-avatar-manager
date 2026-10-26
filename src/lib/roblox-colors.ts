import { OutfitColorSource, RobloxBodyColors } from "@/types/roblox";

// Standard Roblox BrickColor Palette mapping: ID -> { name, hex, rgb }
export const ROBLOX_BRICK_COLORS: Record<
  number,
  { name: string; hex: string; rgb: [number, number, number] }
> = {
  1: { name: "White", hex: "#F2F3F3", rgb: [242, 243, 243] },
  2: { name: "Grey", hex: "#A1A5A2", rgb: [161, 165, 162] },
  3: { name: "Light yellow", hex: "#F9E999", rgb: [249, 233, 153] },
  5: { name: "Brick yellow", hex: "#D7C59A", rgb: [215, 197, 154] },
  9: { name: "Light reddish violet", hex: "#E8BAC8", rgb: [232, 186, 200] },
  11: { name: "Pastel Blue", hex: "#80BBDB", rgb: [128, 187, 219] },
  12: { name: "Light orange brown", hex: "#CBAC7F", rgb: [203, 172, 127] },
  18: { name: "Nougat", hex: "#CC8E69", rgb: [204, 142, 105] },
  21: { name: "Bright red", hex: "#C4281B", rgb: [196, 40, 27] },
  22: { name: "Med. reddish violet", hex: "#C172A2", rgb: [193, 114, 162] },
  23: { name: "Bright blue", hex: "#0D69AC", rgb: [13, 105, 172] },
  24: { name: "Bright yellow", hex: "#F5CD30", rgb: [245, 205, 48] },
  25: { name: "Earth orange", hex: "#624732", rgb: [98, 71, 50] },
  26: { name: "Black", hex: "#1B2A35", rgb: [27, 42, 53] },
  27: { name: "Dark grey", hex: "#6D6E6C", rgb: [109, 110, 108] },
  28: { name: "Dark green", hex: "#28272A", rgb: [40, 39, 42] },
  29: { name: "Medium green", hex: "#A1C48C", rgb: [161, 196, 140] },
  36: { name: "Lig. Yellowish orange", hex: "#F3CF9B", rgb: [243, 207, 155] },
  37: { name: "Bright green", hex: "#4B974B", rgb: [75, 151, 75] },
  38: { name: "Light reddish violet", hex: "#EA9CA9", rgb: [234, 156, 169] },
  39: { name: "Pastel Blue", hex: "#CFE2F3", rgb: [207, 226, 243] },
  40: { name: "Transparent", hex: "#EAEAEA", rgb: [234, 234, 234] },
  41: { name: "Reddish brown", hex: "#CD6A47", rgb: [205, 106, 71] },
  42: { name: "Medium reddish violet", hex: "#E4ADC8", rgb: [228, 173, 200] },
  43: { name: "Light bluish green", hex: "#ACD4CE", rgb: [172, 212, 206] },
  44: { name: "Light yellowish green", hex: "#E7F2A6", rgb: [231, 242, 166] },
  45: { name: "Light bluish violet", hex: "#B9C4E1", rgb: [185, 196, 225] },
  101: { name: "Medium red", hex: "#DA8641", rgb: [218, 134, 65] },
  102: { name: "Medium blue", hex: "#6E99CA", rgb: [110, 153, 202] },
  103: { name: "Light red", hex: "#EE9E82", rgb: [238, 158, 130] },
  104: { name: "Bright violet", hex: "#7F4E93", rgb: [127, 78, 147] },
  105: { name: "Br. yellowish orange", hex: "#E29B40", rgb: [226, 155, 64] },
  106: { name: "Bright orange", hex: "#DA2B34", rgb: [218, 43, 52] },
  107: { name: "Bright bluish green", hex: "#008F9B", rgb: [0, 143, 155] },
  108: { name: "Earth yellow", hex: "#685C43", rgb: [104, 92, 67] },
  119: { name: "Brilliant yellowish green", hex: "#A4BD47", rgb: [164, 189, 71] },
  125: { name: "Light orange", hex: "#EAB892", rgb: [234, 184, 146] },
  133: { name: "Magenta", hex: "#8A1864", rgb: [138, 24, 100] },
  135: { name: "Sand blue", hex: "#74869D", rgb: [116, 134, 157] },
  138: { name: "Sand yellow", hex: "#958A73", rgb: [149, 138, 115] },
  141: { name: "Earth green", hex: "#27462D", rgb: [39, 70, 45] },
  151: { name: "Sand green", hex: "#789082", rgb: [120, 144, 130] },
  153: { name: "Sand red", hex: "#956A63", rgb: [149, 106, 99] },
  192: { name: "Reddish brown", hex: "#694027", rgb: [105, 64, 39] },
  194: { name: "Medium stone grey", hex: "#A3A2A5", rgb: [163, 162, 165] },
  199: { name: "Dark stone grey", hex: "#635F62", rgb: [99, 95, 98] },
  208: { name: "Light stone grey", hex: "#E5E3DF", rgb: [229, 227, 223] },
  217: { name: "Brown", hex: "#7C5C45", rgb: [124, 92, 69] },
  226: { name: "Cool yellow", hex: "#FDF38C", rgb: [253, 243, 140] },
  301: { name: "Pastel blue", hex: "#8CB8E0", rgb: [140, 184, 224] },
  302: { name: "Pastel light blue", hex: "#AFCCE7", rgb: [175, 204, 231] },
  303: { name: "Pastel reddish lilac", hex: "#D9C1DC", rgb: [217, 193, 220] },
  304: { name: "Pastel brown", hex: "#C7A992", rgb: [199, 169, 146] },
  305: { name: "Pastel yellow", hex: "#FDF599", rgb: [253, 245, 153] },
  310: { name: "Pastel orange", hex: "#FDB375", rgb: [253, 179, 117] },
  312: { name: "Pastel green", hex: "#BCE5C0", rgb: [188, 229, 192] },
  317: { name: "Pastel violet", hex: "#B8B5D7", rgb: [184, 181, 215] },
  359: { name: "Ghost blue", hex: "#AFB5D7", rgb: [175, 181, 215] },
  1001: { name: "Institutional white", hex: "#F8F8F8", rgb: [248, 248, 248] },
  1002: { name: "Mid gray", hex: "#CDCDCD", rgb: [205, 205, 205] },
  1003: { name: "Really black", hex: "#111111", rgb: [17, 17, 17] },
  1004: { name: "Really red", hex: "#FF0000", rgb: [255, 0, 0] },
  1005: { name: "Deep orange", hex: "#FF6600", rgb: [255, 102, 0] },
  1006: { name: "Alder", hex: "#E29B40", rgb: [226, 155, 64] },
  1007: { name: "Dust", hex: "#A05F35", rgb: [160, 95, 53] },
  1008: { name: "Olive", hex: "#C7AC78", rgb: [199, 172, 120] },
  1009: { name: "New Yeller", hex: "#FFFF00", rgb: [255, 255, 0] },
  1010: { name: "Camouflage", hex: "#4B974B", rgb: [75, 151, 75] },
  1011: { name: "Grime", hex: "#355938", rgb: [53, 89, 56] },
  1012: { name: "Br. bluish orange", hex: "#5B757A", rgb: [91, 117, 122] },
  1013: { name: "Dark red", hex: "#6B3232", rgb: [107, 50, 50] },
  1014: { name: "Medium red", hex: "#DA8641", rgb: [218, 134, 65] },
  1020: { name: "Navy blue", hex: "#002060", rgb: [0, 32, 96] },
  1024: { name: "Pastel yellow", hex: "#AF7432", rgb: [175, 116, 50] },
  1025: { name: "Pastel orange", hex: "#CBAC7F", rgb: [203, 172, 127] },
  1026: { name: "Earth orange", hex: "#624732", rgb: [98, 71, 50] },
  1027: { name: "Black", hex: "#101010", rgb: [16, 16, 16] },
  1028: { name: "Medium nougat", hex: "#CC8E69", rgb: [204, 142, 105] },
  1029: { name: "Pastel brown", hex: "#8C5638", rgb: [140, 86, 56] },
  1030: { name: "Dark nougat", hex: "#744522", rgb: [116, 69, 34] },
  1031: { name: "Pastel yellow", hex: "#FFF899", rgb: [255, 248, 153] },
  1032: { name: "Cork", hex: "#BC9B5D", rgb: [188, 155, 93] },
};

// Default fallback skin tone: Light Orange / Nougat (#EAB892 / BrickColor 125)
export const DEFAULT_SKIN_COLOR_HEX = "eab892";
export const DEFAULT_SKIN_BRICK_ID = 125;

/**
 * Normalizes any hex string into a clean 6-character lowercase hex string without '#'
 */
export function cleanHex(raw: string | undefined | null): string {
  if (!raw) return DEFAULT_SKIN_COLOR_HEX;
  let hex = raw.trim().replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return DEFAULT_SKIN_COLOR_HEX;
  }
  return hex.toLowerCase();
}

/**
 * Returns formatted hex color with leading '#' for CSS display
 */
export function formatCssHex(hex: string | undefined | null): string {
  const cleaned = cleanHex(hex);
  return `#${cleaned}`;
}

/**
 * Returns hex string for a given Roblox BrickColor ID
 */
export function brickColorIdToHex(id: number | undefined | null): string {
  if (id === undefined || id === null || id <= 0) {
    return `#${DEFAULT_SKIN_COLOR_HEX}`;
  }
  const entry = ROBLOX_BRICK_COLORS[id];
  return entry ? entry.hex : "#A3A2A5";
}

/**
 * Parses hex into [r, g, b]
 */
export function hexToRgb(hex: string): [number, number, number] {
  const cleaned = cleanHex(hex);
  const r = parseInt(cleaned.substring(0, 2), 16) || 0;
  const g = parseInt(cleaned.substring(2, 4), 16) || 0;
  const b = parseInt(cleaned.substring(4, 6), 16) || 0;
  return [r, g, b];
}

/**
 * Finds the closest Roblox BrickColor ID from a hex color string
 */
export function hexToClosestBrickColorId(hex: string | undefined | null): number {
  if (!hex) return DEFAULT_SKIN_BRICK_ID;
  const [r1, g1, b1] = hexToRgb(hex);

  let bestId = DEFAULT_SKIN_BRICK_ID;
  let bestDist = Infinity;

  for (const [idStr, entry] of Object.entries(ROBLOX_BRICK_COLORS)) {
    const id = Number(idStr);
    const [r2, g2, b2] = entry.rgb;
    // Euclidean distance in RGB color space
    const dist = (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestId = id;
    }
  }

  return bestId;
}

/**
 * Ensures a valid bodyColor3s record with all 6 required body part keys in lowercase 6-digit hex format.
 * If bodyColor3s is missing or has missing keys, falls back to bodyColors BrickColor IDs.
 */
export function normalizeBodyColor3s(
  rawColor3s?: Record<string, string | number> | null,
  fallbackBrickColors?: Partial<RobloxBodyColors> | null
): Record<string, string> {
  const fallback = fallbackBrickColors || {
    headColorId: DEFAULT_SKIN_BRICK_ID,
    torsoColorId: DEFAULT_SKIN_BRICK_ID,
    rightArmColorId: DEFAULT_SKIN_BRICK_ID,
    leftArmColorId: DEFAULT_SKIN_BRICK_ID,
    rightLegColorId: DEFAULT_SKIN_BRICK_ID,
    leftLegColorId: DEFAULT_SKIN_BRICK_ID,
  };

  const getPartHex = (
    keys: string[],
    fallbackBrickId: number | undefined
  ): string => {
    if (rawColor3s) {
      for (const k of keys) {
        if (rawColor3s[k]) {
          return cleanHex(String(rawColor3s[k]));
        }
      }
    }
    if (fallbackBrickId && fallbackBrickId > 0) {
      return cleanHex(brickColorIdToHex(fallbackBrickId));
    }
    return DEFAULT_SKIN_COLOR_HEX;
  };

  return {
    headColor3: getPartHex(["headColor3", "headColor", "head", "HeadColor3"], fallback.headColorId),
    torsoColor3: getPartHex(["torsoColor3", "torsoColor", "torso", "TorsoColor3"], fallback.torsoColorId),
    rightArmColor3: getPartHex(["rightArmColor3", "rightArmColor", "rightArm", "RightArmColor3"], fallback.rightArmColorId),
    leftArmColor3: getPartHex(["leftArmColor3", "leftArmColor", "leftArm", "LeftArmColor3"], fallback.leftArmColorId),
    rightLegColor3: getPartHex(["rightLegColor3", "rightLegColor", "rightLeg", "RightLegColor3"], fallback.rightLegColorId),
    leftLegColor3: getPartHex(["leftLegColor3", "leftLegColor", "leftLeg", "LeftLegColor3"], fallback.leftLegColorId),
  };
}

/**
 * Ensures a valid RobloxBodyColors record with all 6 body part color IDs.
 * If brick IDs are missing or 0, derives them from bodyColor3s hex values.
 */
export function normalizeBodyColors(
  rawBodyColors?: Partial<RobloxBodyColors> | null,
  bodyColor3s?: Record<string, string | number> | null
): RobloxBodyColors {
  const getPartId = (
    keys: (keyof RobloxBodyColors)[],
    hexKeys: string[]
  ): number => {
    if (rawBodyColors) {
      for (const k of keys) {
        const val = rawBodyColors[k];
        if (typeof val === "number" && val > 0) {
          return val;
        }
      }
    }
    if (bodyColor3s) {
      for (const hk of hexKeys) {
        if (bodyColor3s[hk]) {
          return hexToClosestBrickColorId(String(bodyColor3s[hk]));
        }
      }
    }
    return DEFAULT_SKIN_BRICK_ID;
  };

  return {
    headColorId: getPartId(["headColorId"], ["headColor3", "headColor", "head"]),
    torsoColorId: getPartId(["torsoColorId"], ["torsoColor3", "torsoColor", "torso"]),
    rightArmColorId: getPartId(["rightArmColorId"], ["rightArmColor3", "rightArmColor", "rightArm"]),
    leftArmColorId: getPartId(["leftArmColorId"], ["leftArmColor3", "leftArmColor", "leftArm"]),
    rightLegColorId: getPartId(["rightLegColorId"], ["rightLegColor3", "rightLegColor", "rightLeg"]),
    leftLegColorId: getPartId(["leftLegColorId"], ["leftLegColor3", "leftLegColor", "leftLeg"]),
  };
}

/**
 * Universal color extractor that extracts BOTH complete bodyColors and bodyColor3s
 * from any outfit object, detail payload, export manifest, or API response.
 */
export function extractOutfitColors(target?: OutfitColorSource | null): {
  bodyColors: RobloxBodyColors;
  bodyColor3s: Record<string, string>;
} {
  if (!target) {
    const bodyColors = normalizeBodyColors(null, null);
    const bodyColor3s = normalizeBodyColor3s(null, bodyColors);
    return { bodyColors, bodyColor3s };
  }

  const rawColors: Partial<RobloxBodyColors> | null =
    target.bodyColors ||
    target.details?.bodyColors ||
    (typeof target.headColorId === "number"
      ? { headColorId: target.headColorId }
      : null);

  const rawColor3s: Record<string, string | number> | null =
    target.bodyColor3s ||
    target.details?.bodyColor3s ||
    (target.headColor3 ? { headColor3: target.headColor3 } : null);

  const bodyColor3s = normalizeBodyColor3s(rawColor3s, rawColors);
  const bodyColors = normalizeBodyColors(rawColors, bodyColor3s);

  return { bodyColors, bodyColor3s };
}
