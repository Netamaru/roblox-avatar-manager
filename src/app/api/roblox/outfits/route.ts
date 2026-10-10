import { getAuthenticatedUser, getOutfitThumbnails, getUserOutfits } from "@/lib/roblox-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cookie = body.cookie;
    let userId = body.userId;

    if (!cookie) {
      return NextResponse.json({ error: ".ROBLOSECURITY cookie is required." }, { status: 400 });
    }

    if (!userId) {
      const user = await getAuthenticatedUser(cookie);
      userId = user.id;
    }

    const outfitSummaries = await getUserOutfits(cookie, userId);
    const outfitIds = outfitSummaries.map((o) => o.id);
    const thumbnailMap = await getOutfitThumbnails(outfitIds);

    const outfits = outfitSummaries.map((summary, index) => ({
      id: summary.id,
      name: summary.name,
      isEditable: summary.isEditable,
      thumbnailUrl: thumbnailMap[summary.id] || null,
      originalIndex: index,
      currentIndex: index,
    }));

    return NextResponse.json({ success: true, count: outfits.length, outfits });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch Roblox outfits." },
      { status: 500 }
    );
  }
}
