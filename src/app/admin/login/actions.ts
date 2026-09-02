"use server";

import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";

export interface EstadoLogin {
  erro?: string;
}

export async function entrarAdmin(
  _estadoAnterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Informe email e senha." };
  }

  const supabase = await criarClienteSupabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    return { erro: "Email ou senha inválidos." };
  }

  redirect("/admin");
}
