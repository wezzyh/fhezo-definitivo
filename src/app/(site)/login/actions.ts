"use server";

import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { vincularClienteExistentePorEmail } from "@/lib/clientes/sessao";

export interface EstadoFormularioLogin {
  erro?: string;
}

export async function entrarCliente(
  _estadoAnterior: EstadoFormularioLogin,
  formData: FormData,
): Promise<EstadoFormularioLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const proximaUrl = String(formData.get("proximo") ?? "/conta");

  if (!email || !senha) {
    return { erro: "Preencha e-mail e senha." };
  }

  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error || !data.user) {
    return { erro: "E-mail ou senha incorretos." };
  }

  await vincularClienteExistentePorEmail(data.user.id, email);

  redirect(proximaUrl.startsWith("/") ? proximaUrl : "/conta");
}
