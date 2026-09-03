"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { gerarSlug, descendentesDe } from "@/lib/categorias/hierarquia";
import type { Categoria } from "@/types/database";

export interface EstadoFormularioCategoria {
  erro?: string;
}

interface DadosCategoriaValidados {
  nome: string;
  categoriaPaiId: string | null;
  ativo: boolean;
}

function validarDadosCategoria(formData: FormData): DadosCategoriaValidados | { erro: string } {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "O campo Nome é obrigatório." };

  const categoriaPaiIdBruto = String(formData.get("categoria_pai_id") ?? "").trim();
  const categoriaPaiId = categoriaPaiIdBruto || null;
  const ativo = formData.get("ativo") === "on";

  return { nome, categoriaPaiId, ativo };
}

/** Garante um slug único, acrescentando um sufixo numérico em caso de colisão. */
async function gerarSlugUnico(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServidor>>,
  nome: string,
  idParaIgnorar?: string,
): Promise<string> {
  const base = gerarSlug(nome) || "categoria";
  let candidato = base;
  let sufixo = 2;

  for (;;) {
    let query = supabase.from("categorias").select("id").eq("slug", candidato);
    if (idParaIgnorar) query = query.neq("id", idParaIgnorar);
    const { data } = await query.maybeSingle<{ id: string }>();
    if (!data) return candidato;
    candidato = `${base}-${sufixo}`;
    sufixo++;
  }
}

export async function criarCategoria(
  _estadoAnterior: EstadoFormularioCategoria,
  formData: FormData,
): Promise<EstadoFormularioCategoria> {
  const dados = validarDadosCategoria(formData);
  if ("erro" in dados) return dados;

  const supabase = await criarClienteSupabaseServidor();
  const slug = await gerarSlugUnico(supabase, dados.nome);

  const { error } = await supabase.from("categorias").insert({
    nome: dados.nome,
    slug,
    categoria_pai_id: dados.categoriaPaiId,
    ativo: dados.ativo,
  });

  if (error) {
    return { erro: `Erro ao salvar categoria: ${error.message}` };
  }

  revalidatePath("/admin/categorias");
  revalidatePath("/admin/produtos");
  redirect("/admin/categorias");
}

export async function atualizarCategoria(
  id: string,
  _estadoAnterior: EstadoFormularioCategoria,
  formData: FormData,
): Promise<EstadoFormularioCategoria> {
  const dados = validarDadosCategoria(formData);
  if ("erro" in dados) return dados;

  if (dados.categoriaPaiId) {
    if (dados.categoriaPaiId === id) {
      return { erro: "Uma categoria não pode ser mãe dela mesma." };
    }

    const supabaseVerificacao = await criarClienteSupabaseServidor();
    const { data: todasCategorias } = await supabaseVerificacao
      .from("categorias")
      .select("*")
      .returns<Categoria[]>();

    const descendentes = descendentesDe(id, todasCategorias ?? []);
    if (descendentes.has(dados.categoriaPaiId)) {
      return { erro: "Não é possível escolher uma subcategoria dela mesma como categoria-mãe." };
    }
  }

  const supabase = await criarClienteSupabaseServidor();
  const slug = await gerarSlugUnico(supabase, dados.nome, id);

  const { error } = await supabase
    .from("categorias")
    .update({
      nome: dados.nome,
      slug,
      categoria_pai_id: dados.categoriaPaiId,
      ativo: dados.ativo,
    })
    .eq("id", id);

  if (error) {
    return { erro: `Erro ao atualizar categoria: ${error.message}` };
  }

  revalidatePath("/admin/categorias");
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
  redirect("/admin/categorias");
}

export async function alternarAtivoCategoria(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const ativo = formData.get("ativo") === "true";
  if (!id) return;

  const supabase = await criarClienteSupabaseServidor();
  await supabase.from("categorias").update({ ativo: !ativo }).eq("id", id);

  revalidatePath("/admin/categorias");
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
}

export type ResultadoCategoriaRapida =
  | { sucesso: true; id: string; nome: string }
  | { sucesso: false; erro: string };

/**
 * Criação rápida de categoria de TOPO a partir do formulário de produto
 * (sem sair da tela) — usada pelo botão "+ nova categoria" em
 * formulario-produto.tsx. Para hierarquia (escolher categoria-mãe), use a
 * tela completa em /admin/categorias.
 */
export async function criarCategoriaRapida(nome: string): Promise<ResultadoCategoriaRapida> {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return { sucesso: false, erro: "Informe o nome da categoria." };

  const supabase = await criarClienteSupabaseServidor();
  const slug = await gerarSlugUnico(supabase, nomeLimpo);

  const { data, error } = await supabase
    .from("categorias")
    .insert({ nome: nomeLimpo, slug, ativo: true })
    .select("id, nome")
    .single<{ id: string; nome: string }>();

  if (error || !data) {
    return { sucesso: false, erro: `Erro ao criar categoria: ${error?.message ?? "erro desconhecido"}` };
  }

  revalidatePath("/admin/categorias");
  return { sucesso: true, id: data.id, nome: data.nome };
}
