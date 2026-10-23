import { NextResponse } from "next/server";
import { getSessionClient } from "@/lib/supabase";
export async function POST(request:Request) { const auth=await getSessionClient(); await auth.auth.signOut(); return NextResponse.redirect(new URL("/admin/sign-in",request.url),303); }
