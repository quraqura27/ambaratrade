import { NextRequest, NextResponse } from "next/server";
import { getSessionClient } from "@/lib/supabase";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedPath = request.nextUrl.searchParams.get("next") ?? "/admin";
  let safePath = "/admin";
  if (requestedPath.startsWith("/") && !requestedPath.startsWith("//")) {
    try {
      const destination = new URL(requestedPath, request.url);
      if (destination.origin === request.nextUrl.origin) safePath = requestedPath;
    } catch {
      // Ignore malformed redirect paths supplied in the callback URL.
    }
  }
  if (code) {
    const client = await getSessionClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safePath, request.url));
  }
  return NextResponse.redirect(new URL("/admin/sign-in?error=invitation", request.url));
}
