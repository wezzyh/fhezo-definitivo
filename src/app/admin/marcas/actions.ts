"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { removerImagemAdminSeOrfa } from "@/components/admin/upload-imagem-actions";
import type { Marca } from "@/types/database";

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
  const imagem_url = String(formData.get("imagem_url") ?? "").trim() || null;

  const supabase = await criarClienteSupabaseServidor();
  const { error } = await supabase.from("marcas").insert({ nome, ativo, imagem_url });

  if (error) {
    return { erro: `Erro ao salvar marca: ${error.message}` };
  }

  revalidatePath("/admin/marcas");
  revalidatePath("/admin/produtos");
  revalidatePath("/");
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
  const imagem_url = String(formData.get("imagem_url") ?? "").trim() || null;

  const supabase = await criarClienteSupabaseServidor();
  const { error } = await supabase.from("marcas").update({ nome, ativo, imagem_url }).eq("id", id);

  if (error) {
    return { erro: `Erro ao atualizar marca: ${error.message}` };
  }

  const imagemAnterior = String(formData.get("imagem_url_anterior") ?? "").trim() || null;
  await removerImagemAdminSeOrfa(imagemAnterior, imagem_url);

  revalidatePath("/admin/marcas");
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
  revalidatePath("/");
  redirect("/admin/marcas");
}

/**
 * Move uma marca uma posição pra cima/baixo (lista única, marcas não têm
 * hierarquia) — troca o valor de "ordem" entre ela e a vizinha adjacente.
 */
export async function moverMarca(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const direcao = Number(formData.get("direcao") ?? 0);
  if (!id || (direcao !== 1 && direcao !== -1)) return;

  const supabase = await criarClienteSupabaseServidor();

  const { data: marcas } = await supabase
    .from("marcas")
    .select("id, ordem")
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true })
    .returns<Pick<Marca, "id" | "ordem">[]>();

  if (!marcas) return;

  const indiceAtual = marcas.findIndex((marca) => marca.id === id);
  const indiceVizinha = indiceAtual + direcao;
  if (indiceAtual === -1 || indiceVizinha < 0 || indiceVizinha >= marcas.length) return;

  const atual = marcas[indiceAtual];
  const vizinha = marcas[indiceVizinha];

  await Promise.all([
    supabase.from("marcas").update({ ordem: vizinha.ordem }).eq("id", id),
    supabase.from("marcas").update({ ordem: atual.ordem }).eq("id", vizinha.id),
  ]);

  revalidatePath("/admin/marcas");
  revalidatePath("/");
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
