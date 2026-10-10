import { getAuthenticatedUser } from "@/lib/roblox-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cookie = body.cookie;

    if (!cookie || typeof cookie !== "string") {
      return NextResponse.json({ error: ".ROBLOSECURITY cookie is required." }, { status: 400 });
    }

    const user = await getAuthenticatedUser(cookie);
    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to verify Roblox account." },
      { status: 401 }
    );
  }
}
