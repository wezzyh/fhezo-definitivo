"use server";

import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { obterUrlBaseSite } from "@/lib/url-site";
import type { Cliente, TipoPessoa } from "@/types/database";

export interface EstadoFormularioCadastro {
  erro?: string;
  /** Definido quando o cadastro deu certo mas o projeto exige confirmação por e-mail antes de liberar a sessão — nesse caso não há redirect, só uma mensagem. */
  mensagemSucesso?: string;
}

export async function cadastrarCliente(
  _estadoAnterior: EstadoFormularioCadastro,
  formData: FormData,
): Promise<EstadoFormularioCadastro> {
  const tipo = (String(formData.get("tipo") ?? "PF") === "PJ" ? "PJ" : "PF") as TipoPessoa;
  const nome = String(formData.get("nome") ?? "").trim();
  const documento = String(formData.get("documento") ?? "").replace(/\D/g, "");
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const proximaUrl = String(formData.get("proximo") ?? "/conta");

  if (!nome || !documento || !email || !senha) {
    return { erro: "Preencha todos os campos obrigatórios." };
  }
  if (senha.length < 6) {
    return { erro: "A senha precisa ter pelo menos 6 caracteres." };
  }

  const supabase = await criarClienteSupabaseServidor();
  const urlBase = await obterUrlBaseSite();

  // emailRedirectTo manda o link de confirmação para ESTE site (rota
  // /auth/confirm, que troca o token por sessão) em vez de para a "Site
  // URL" genérica configurada no painel do Supabase. Sem isso, quem
  // confirma o e-mail cai na home sem sessão nenhuma e parece que nada
  // aconteceu. O destino precisa estar liberado em Supabase >
  // Authentication > URL Configuration > Redirect URLs.
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { emailRedirectTo: `${urlBase}/auth/confirm?next=${encodeURIComponent(proximaUrl)}` },
  });

  if (error) {
    return { erro: error.message === "User already registered" ? "Já existe uma conta com este e-mail." : error.message };
  }
  if (!data.user) {
    return { erro: "Não foi possível criar sua conta agora. Tente novamente em instantes." };
  }

  const supabaseAdmin = criarClienteSupabaseAdmin();

  const { data: existentes } = await supabaseAdmin
    .from("clientes")
    .select("id, auth_user_id")
    .eq("documento", documento)
    .limit(1)
    .returns<Pick<Cliente, "id" | "auth_user_id">[]>();

  const existente = existentes?.[0];

  if (existente) {
    if (existente.auth_user_id && existente.auth_user_id !== data.user.id) {
      return { erro: "Já existe uma conta cadastrada para este CPF/CNPJ. Tente entrar em vez de se cadastrar." };
    }
    await supabaseAdmin
      .from("clientes")
      .update({ nome, email, auth_user_id: data.user.id })
      .eq("id", existente.id);
  } else {
    await supabaseAdmin.from("clientes").insert({
      tipo,
      nome,
      documento,
      email,
      telefone: null,
      auth_user_id: data.user.id,
    });
  }

  if (!data.session) {
    return { mensagemSucesso: "Conta criada! Confirme seu e-mail para poder entrar." };
  }

  redirect(proximaUrl.startsWith("/") ? proximaUrl : "/conta");
}

/**
 * Reenvia o e-mail de confirmação de cadastro. Existe porque o primeiro
 * e-mail se perde com frequência (spam, digitação errada percebida depois,
 * limite de envio do provedor) e, sem isto, a única saída seria o admin
 * confirmar a conta na mão pelo painel do Supabase.
 *
 * Não distingue "e-mail não cadastrado" de "e-mail já confirmado": responde
 * a mesma coisa nos dois casos, pelo mesmo motivo de
 * pedirRedefinicaoSenha — não entregar quem tem conta para quem ficar
 * testando endereços.
 */
export async function reenviarConfirmacaoEmail(
  _estadoAnterior: EstadoFormularioCadastro,
  formData: FormData,
): Promise<EstadoFormularioCadastro> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { erro: "Informe o e-mail para reenviar a confirmação." };
  }

  const supabase = await criarClienteSupabaseServidor();
  const urlBase = await obterUrlBaseSite();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${urlBase}/auth/confirm?next=${encodeURIComponent("/conta")}` },
  });

  if (error) {
    return { erro: "Não foi possível reenviar agora. Tente de novo em alguns minutos." };
  }

  return { mensagemSucesso: "Reenviamos o e-mail de confirmação. Confira sua caixa de entrada e o spam." };
}
