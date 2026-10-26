import { getErrorMessage } from "@/lib/error-message";
import { getCsrfToken } from "@/lib/roblox-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cookie = body.cookie;

    if (!cookie) {
      return NextResponse.json({ error: ".ROBLOSECURITY cookie is required." }, { status: 400 });
    }

    const csrfToken = await getCsrfToken(cookie);
    return NextResponse.json({ success: true, csrfToken });
  } catch (err) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Failed to obtain CSRF token.") },
      { status: 500 }
    );
  }
}
