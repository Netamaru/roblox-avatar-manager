import { getOutfitDetails } from "@/lib/roblox-server";
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
      const results: Record<number, any> = {};
      const errors: Record<number, string> = {};
      const chunkSize = 5;

      for (let i = 0; i < outfitIds.length; i += chunkSize) {
        const chunk = outfitIds.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (id) => {
            try {
              const detail = await getOutfitDetails(cookie, Number(id), userId);
              results[id] = detail;
            } catch (err: any) {
              errors[id] = err.message || "Failed to fetch";
            }
          })
        );
      }

      return NextResponse.json({ success: true, details: results, errors });
    }

    return NextResponse.json({ error: "outfitId or outfitIds is required." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch outfit details." },
      { status: 500 }
    );
  }
}
