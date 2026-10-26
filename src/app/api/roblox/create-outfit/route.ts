import { getErrorMessage } from "@/lib/error-message";
import { assetIdOf } from "@/lib/outfit-json";
import { extractOutfitColors } from "@/lib/roblox-colors";
import { createOutfit } from "@/lib/roblox-server";
import { OutfitWritePayload } from "@/types/roblox";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cookie, outfit, csrfToken } = body;

    if (!cookie || !outfit) {
      return NextResponse.json(
        { error: "cookie and outfit payload are required." },
        { status: 400 }
      );
    }

    const typedOutfit = outfit as OutfitWritePayload & { assetIds?: number[] };
    const { bodyColors, bodyColor3s } = extractOutfitColors(typedOutfit);
    const assets = Array.isArray(typedOutfit.assets) ? typedOutfit.assets : undefined;
    const assetIds =
      typedOutfit.assetIds ||
      (assets
        ? assets.map((asset) => assetIdOf(asset)).filter((id): id is number => id !== undefined)
        : []);

    const payload = {
      name: typedOutfit.name?.trim() || "Avatar",
      bodyColors,
      bodyColor3s,
      assetIds,
      assets,
      scale: typedOutfit.scale || {
        height: 1,
        width: 1,
        head: 1,
        depth: 1,
        proportion: 0,
        bodyType: 0,
      },
      playerAvatarType: typedOutfit.playerAvatarType || "R15",
    };

    const result = await createOutfit(cookie, payload, csrfToken);
    return NextResponse.json({ ...result });
  } catch (err) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Failed to create new outfit.") },
      { status: 500 }
    );
  }
}
