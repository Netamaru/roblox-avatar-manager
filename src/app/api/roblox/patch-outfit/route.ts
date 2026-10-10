import { getOutfitDetails, patchOutfit } from "@/lib/roblox-server";
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

    const patchPayload = {
      name: finalName,
      bodyColors: payload.bodyColors,
      bodyColor3s: payload.bodyColor3s,
      assetIds:
        payload.assetIds ||
        (payload.assets ? payload.assets.map((a: any) => (typeof a === "number" ? a : a.id)) : []),
      assets: payload.assets,
      scale: payload.scale || {
        height: 1,
        width: 1,
        head: 1,
        depth: 1,
        proportion: 0,
        bodyType: 0,
      },
      playerAvatarType: payload.playerAvatarType || "R15",
    };

    const result = await patchOutfit(cookie, numericOutfitId, patchPayload, csrfToken);

    // Fetch updated thumbnail
    let thumbnailUrl: string | undefined;
    try {
      const thumbRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/outfits?userOutfitIds=${numericOutfitId}&size=150x150&format=Png&isCircular=false`,
        { cache: "no-store" }
      );
      if (thumbRes.ok) {
        const thumbJson = await thumbRes.json();
        if (thumbJson.data && thumbJson.data.length > 0) {
          thumbnailUrl = thumbJson.data[0].imageUrl;
        }
      }
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
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to patch outfit." },
      { status: 500 }
    );
  }
}
