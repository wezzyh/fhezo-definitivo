"use server";

import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { obterUrlBaseSite } from "@/lib/url-site";

export interface EstadoEsqueciSenha {
  erro?: string;
  enviado?: boolean;
}

export async function pedirRedefinicaoSenha(
  _estadoAnterior: EstadoEsqueciSenha,
  formData: FormData,
): Promise<EstadoEsqueciSenha> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { erro: "Informe o e-mail da sua conta." };
  }

  const supabase = await criarClienteSupabaseServidor();
  const urlBase = await obterUrlBaseSite();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${urlBase}/auth/confirm?next=${encodeURIComponent("/redefinir-senha")}`,
  });

  // Erro real de envio (SMTP fora do ar, limite de taxa) é mostrado; o
  // "e-mail não existe" NÃO — responder diferente para e-mail cadastrado e
  // não cadastrado entregaria a lista de clientes para quem ficasse
  // testando endereços. O Supabase já devolve sucesso nos dois casos.
  if (error) {
    return { erro: "Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos." };
  }

  return { enviado: true };
}
