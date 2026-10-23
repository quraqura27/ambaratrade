import { NextRequest, NextResponse } from "next/server";
import { getSessionClient } from "@/lib/supabase";
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (tokenHash && type === "invite") {
    const client = await getSessionClient();
    const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: "invite" });
    if (!error) return NextResponse.redirect(new URL("/admin/accept", request.url));
  }
  return NextResponse.redirect(new URL("/admin/sign-in?error=invitation", request.url));
}
