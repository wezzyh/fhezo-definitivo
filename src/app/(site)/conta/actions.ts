"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { obterClienteLogado } from "@/lib/clientes/sessao";

export interface EstadoFormularioConta {
  erro?: string;
  sucesso?: boolean;
}

export async function atualizarDadosCliente(
  _estadoAnterior: EstadoFormularioConta,
  formData: FormData,
): Promise<EstadoFormularioConta> {
  const logado = await obterClienteLogado();
  if (!logado?.cliente) return { erro: "Sessão expirada. Faça login novamente." };

  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").replace(/\D/g, "");

  if (!nome) return { erro: "O nome é obrigatório." };

  const supabase = await criarClienteSupabaseServidor();
  const { error } = await supabase
    .from("clientes")
    .update({ nome, telefone: telefone || null })
    .eq("id", logado.cliente.id);

  if (error) return { erro: `Erro ao salvar: ${error.message}` };

  revalidatePath("/conta");
  return { sucesso: true };
}

export async function atualizarEnderecoCliente(
  _estadoAnterior: EstadoFormularioConta,
  formData: FormData,
): Promise<EstadoFormularioConta> {
  const logado = await obterClienteLogado();
  if (!logado?.cliente) return { erro: "Sessão expirada. Faça login novamente." };

  const dados = {
    endereco_cep: String(formData.get("cep") ?? "").replace(/\D/g, "") || null,
    endereco_rua: String(formData.get("rua") ?? "").trim() || null,
    endereco_numero: String(formData.get("numero") ?? "").trim() || null,
    endereco_complemento: String(formData.get("complemento") ?? "").trim() || null,
    endereco_bairro: String(formData.get("bairro") ?? "").trim() || null,
    endereco_cidade: String(formData.get("cidade") ?? "").trim() || null,
    endereco_uf: String(formData.get("uf") ?? "").trim() || null,
  };

  const supabase = await criarClienteSupabaseServidor();
  const { error } = await supabase.from("clientes").update(dados).eq("id", logado.cliente.id);

  if (error) return { erro: `Erro ao salvar endereço: ${error.message}` };

  revalidatePath("/conta");
  return { sucesso: true };
}

export async function sairCliente(): Promise<void> {
  const supabase = await criarClienteSupabaseServidor();
  await supabase.auth.signOut();
  redirect("/");
}
