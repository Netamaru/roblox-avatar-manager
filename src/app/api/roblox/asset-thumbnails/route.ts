import { getErrorMessage } from "@/lib/error-message";
import { getAssetThumbnails } from "@/lib/roblox-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cookie = body.cookie;
    const rawIds = body.assetIds;

    if (!cookie) {
      return NextResponse.json(
        { error: ".ROBLOSECURITY cookie is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return NextResponse.json({ success: true, thumbnails: {} });
    }

    const assetIds = rawIds
      .map((id: unknown) => Number(id))
      .filter((id: number) => Number.isFinite(id) && id > 0);

    const thumbnails = await getAssetThumbnails(assetIds);
    return NextResponse.json({ success: true, thumbnails });
  } catch (err) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Failed to fetch asset thumbnails.") },
      { status: 500 }
    );
  }
}
