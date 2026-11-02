import { getErrorMessage } from "@/lib/error-message";
import { cleanCookie, getAuthenticatedUser, hasConfiguredCookie } from "@/lib/roblox-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const cookie = cleanCookie();
    if (!cookie) {
      return NextResponse.json({ authenticated: false, hasEnvCookie: false });
    }
    const user = await getAuthenticatedUser(cookie);
    return NextResponse.json({ authenticated: true, hasEnvCookie: true, user });
  } catch (err) {
    return NextResponse.json({
      authenticated: false,
      hasEnvCookie: hasConfiguredCookie(),
      error: getErrorMessage(err, "Failed to verify Roblox account from .env"),
    });
  }
}

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

    const user = await getAuthenticatedUser(cookie);
    return NextResponse.json({ success: true, user, isFromEnv: !body?.cookie });
  } catch (err) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Failed to verify Roblox account.") },
      { status: 401 }
    );
  }
}

