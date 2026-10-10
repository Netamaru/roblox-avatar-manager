import { createOutfit } from "@/lib/roblox-server";
import { extractOutfitColors } from "@/lib/roblox-colors";
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

    const { bodyColors, bodyColor3s } = extractOutfitColors(outfit);

    const payload = {
      name: outfit.name?.trim() || "Avatar",
      bodyColors,
      bodyColor3s,
      assetIds: outfit.assetIds || (outfit.assets ? outfit.assets.map((a: any) => a.id) : []),
      assets: outfit.assets || undefined,
      scale: outfit.scale || {
        height: 1,
        width: 1,
        head: 1,
        depth: 1,
        proportion: 0,
        bodyType: 0,
      },
      playerAvatarType: outfit.playerAvatarType || "R15",
    };

    const result = await createOutfit(cookie, payload, csrfToken);
    return NextResponse.json({ ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create new outfit." },
      { status: 500 }
    );
  }
}
