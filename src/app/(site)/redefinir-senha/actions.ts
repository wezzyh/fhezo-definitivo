"use server";

import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";

export interface EstadoRedefinirSenha {
  erro?: string;
}

export async function redefinirSenha(
  _estadoAnterior: EstadoRedefinirSenha,
  formData: FormData,
): Promise<EstadoRedefinirSenha> {
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  // Mesmo mínimo de 6 caracteres já exigido no cadastro (ver
  // src/app/(site)/cadastro/actions.ts) — manter a régua igual nos dois
  // lugares evita uma senha aceita num fluxo e recusada no outro.
  if (senha.length < 6) {
    return { erro: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (senha !== confirmacao) {
    return { erro: "As duas senhas não são iguais." };
  }

  const supabase = await criarClienteSupabaseServidor();

  // A sessão aqui veio do link de recuperação (trocado por cookies em
  // /auth/confirm). Sem ela, updateUser não tem em quem aplicar a troca.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erro: "Seu link de recuperação expirou. Peça um novo em “Esqueci minha senha”." };
  }

  const { error } = await supabase.auth.updateUser({ password: senha });

  if (error) {
    return { erro: `Não foi possível alterar a senha: ${error.message}` };
  }

  redirect("/conta");
}
