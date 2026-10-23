import "server-only";
import { redirect } from "next/navigation";
import { getServiceClient, getSessionClient } from "./supabase";

export type Staff = { id: string; email: string; role: "owner" | "editor" };

export async function getStaff(): Promise<Staff | null> {
  const session = await getSessionClient();
  const { data: userResult, error } = await session.auth.getUser();
  if (error || !userResult.user) return null;
  const { data: profile } = await getServiceClient()
    .from("staff_profiles")
    .select("user_id,email,role,active")
    .eq("user_id", userResult.user.id)
    .single();
  if (!profile?.active || !["owner", "editor"].includes(profile.role)) return null;
  return { id: profile.user_id, email: profile.email, role: profile.role };
}

export async function requireStaff(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/sign-in");
  return staff;
}

export async function requireOwner(): Promise<Staff> {
  const staff = await requireStaff();
  if (staff.role !== "owner") redirect("/admin");
  return staff;
}
