import { getErrorMessage } from "@/lib/error-message";
import { cleanCookie, getCsrfToken } from "@/lib/roblox-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cookie = cleanCookie(body?.cookie);

    if (!cookie) {
      return NextResponse.json(
        { error: ".ROBLOSECURITY cookie is required (or configure cookie in .env)." },
        { status: 400 }
      );
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
