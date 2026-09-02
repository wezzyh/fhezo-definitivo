"use server";

import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";

export async function sairAdmin(): Promise<void> {
  const supabase = await criarClienteSupabaseServidor();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
