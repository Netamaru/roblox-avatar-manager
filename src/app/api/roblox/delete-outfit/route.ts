import { deleteOutfit } from "@/lib/roblox-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cookie, outfitId, csrfToken } = body;

    if (!cookie || !outfitId) {
      return NextResponse.json(
        { error: "cookie and outfitId are required." },
        { status: 400 }
      );
    }

    const result = await deleteOutfit(cookie, Number(outfitId), csrfToken);
    return NextResponse.json({ ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete outfit." },
      { status: 500 }
    );
  }
}
