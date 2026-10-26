import { getErrorMessage } from "@/lib/error-message";
import { assetIdOf } from "@/lib/outfit-json";
import { getOutfitDetails, getOutfitThumbnails, patchOutfit } from "@/lib/roblox-server";
import { OutfitWritePayload } from "@/types/roblox";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cookie, outfitId, name, payload, csrfToken, userId } = body;

    if (!cookie || !outfitId) {
      return NextResponse.json(
        { error: "cookie and outfitId are required." },
        { status: 400 }
      );
    }

    const numericOutfitId = Number(outfitId);
    if (isNaN(numericOutfitId) || numericOutfitId <= 0) {
      return NextResponse.json(
        { error: "Invalid outfitId." },
        { status: 400 }
      );
    }

    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { error: "Valid payload object is required." },
        { status: 400 }
      );
    }

    // Custom name takes precedence, followed by payload name, followed by "Avatar"
    const finalName = (name || payload.name || "Avatar").trim();

    const typedPayload = payload as OutfitWritePayload;
    const patchPayload = {
      name: finalName,
      bodyColors: typedPayload.bodyColors,
      bodyColor3s: typedPayload.bodyColor3s,
      assetIds:
        typedPayload.assetIds ||
        (typedPayload.assets
          ? typedPayload.assets
              .map((asset) => assetIdOf(asset))
              .filter((id): id is number => id !== undefined)
          : []),
      assets: typedPayload.assets,
      scale: typedPayload.scale || {
        height: 1,
        width: 1,
        head: 1,
        depth: 1,
        proportion: 0,
        bodyType: 0,
      },
      playerAvatarType: typedPayload.playerAvatarType || "R15",
    };

    const result = await patchOutfit(cookie, numericOutfitId, patchPayload, csrfToken);

    let thumbnailUrl: string | undefined;
    try {
      const thumbnailMap = await getOutfitThumbnails([numericOutfitId]);
      thumbnailUrl = thumbnailMap[numericOutfitId];
    } catch {
      // ignore thumbnail error
    }

    // Fetch updated full details
    let updatedDetails = null;
    try {
      updatedDetails = await getOutfitDetails(cookie, numericOutfitId, userId ? Number(userId) : undefined);
    } catch (e) {
      console.warn("Could not fetch updated outfit details after patch", e);
    }

    return NextResponse.json({
      success: true,
      newCsrfToken: result.newCsrfToken,
      removedAssets: result.removedAssets,
      renamedToDefault: result.renamedToDefault,
      data: result.data,
      thumbnailUrl,
      details: updatedDetails,
    });
  } catch (err) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Failed to patch outfit.") },
      { status: 500 }
    );
  }
}
