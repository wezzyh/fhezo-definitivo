"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";

export interface EstadoFormularioMarca {
  erro?: string;
}

function validarNome(formData: FormData): string | { erro: string } {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "O campo Nome é obrigatório." };
  return nome;
}

export async function criarMarca(
  _estadoAnterior: EstadoFormularioMarca,
  formData: FormData,
): Promise<EstadoFormularioMarca> {
  const nome = validarNome(formData);
  if (typeof nome !== "string") return nome;

  const ativo = formData.get("ativo") === "on";

  const supabase = await criarClienteSupabaseServidor();
  const { error } = await supabase.from("marcas").insert({ nome, ativo });

  if (error) {
    return { erro: `Erro ao salvar marca: ${error.message}` };
  }

  revalidatePath("/admin/marcas");
  revalidatePath("/admin/produtos");
  redirect("/admin/marcas");
}

export async function atualizarMarca(
  id: string,
  _estadoAnterior: EstadoFormularioMarca,
  formData: FormData,
): Promise<EstadoFormularioMarca> {
  const nome = validarNome(formData);
  if (typeof nome !== "string") return nome;

  const ativo = formData.get("ativo") === "on";

  const supabase = await criarClienteSupabaseServidor();
  const { error } = await supabase.from("marcas").update({ nome, ativo }).eq("id", id);

  if (error) {
    return { erro: `Erro ao atualizar marca: ${error.message}` };
  }

  revalidatePath("/admin/marcas");
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
  redirect("/admin/marcas");
}

export async function alternarAtivoMarca(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const ativo = formData.get("ativo") === "true";
  if (!id) return;

  const supabase = await criarClienteSupabaseServidor();
  await supabase.from("marcas").update({ ativo: !ativo }).eq("id", id);

  revalidatePath("/admin/marcas");
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
}

export type ResultadoMarcaRapida =
  | { sucesso: true; id: string; nome: string }
  | { sucesso: false; erro: string };

/**
 * Criação rápida de marca a partir do formulário de produto (sem sair da
 * tela) — usada pelo botão "+ nova marca" em formulario-produto.tsx.
 * Diferente de criarMarca(): não redireciona, devolve o registro criado
 * para o formulário adicionar na lista local e já selecionar.
 */
export async function criarMarcaRapida(nome: string): Promise<ResultadoMarcaRapida> {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return { sucesso: false, erro: "Informe o nome da marca." };

  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase
    .from("marcas")
    .insert({ nome: nomeLimpo, ativo: true })
    .select("id, nome")
    .single<{ id: string; nome: string }>();

  if (error || !data) {
    return { sucesso: false, erro: `Erro ao criar marca: ${error?.message ?? "erro desconhecido"}` };
  }

  revalidatePath("/admin/marcas");
  return { sucesso: true, id: data.id, nome: data.nome };
}
