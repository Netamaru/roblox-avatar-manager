import { getErrorMessage } from "@/lib/error-message";
import { getOutfitDetails } from "@/lib/roblox-server";
import { RobloxOutfitDetail } from "@/types/roblox";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cookie = body.cookie;
    const outfitId = body.outfitId;
    const outfitIds = body.outfitIds;
    const userId = body.userId ? Number(body.userId) : undefined;

    if (!cookie) {
      return NextResponse.json({ error: ".ROBLOSECURITY cookie is required." }, { status: 400 });
    }

    if (outfitId) {
      const details = await getOutfitDetails(cookie, Number(outfitId), userId);
      return NextResponse.json({ success: true, details });
    }

    if (Array.isArray(outfitIds)) {
      const results: Record<number, RobloxOutfitDetail> = {};
      const errors: Record<number, string> = {};
      const chunkSize = 5;

      for (let i = 0; i < outfitIds.length; i += chunkSize) {
        const chunk = outfitIds.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (id: unknown) => {
            const numericId = Number(id);
            try {
              const detail = await getOutfitDetails(cookie, numericId, userId);
              results[numericId] = detail;
            } catch (err) {
              errors[numericId] = getErrorMessage(err, "Failed to fetch");
            }
          })
        );
      }

      return NextResponse.json({ success: true, details: results, errors });
    }

    return NextResponse.json({ error: "outfitId or outfitIds is required." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Failed to fetch outfit details.") },
      { status: 500 }
    );
  }
}
