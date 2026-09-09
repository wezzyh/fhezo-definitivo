"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { descendentesDe } from "@/lib/categorias/hierarquia";
import { gerarSlugUnico } from "@/lib/categorias/slug-unico";
import { removerImagemAdminSeOrfa } from "@/components/admin/upload-imagem-actions";
import type { Categoria } from "@/types/database";

export interface EstadoFormularioCategoria {
  erro?: string;
}

interface DadosCategoriaValidados {
  nome: string;
  categoriaPaiId: string | null;
  ativo: boolean;
  imagemUrl: string | null;
}

function validarDadosCategoria(formData: FormData): DadosCategoriaValidados | { erro: string } {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "O campo Nome é obrigatório." };

  const categoriaPaiIdBruto = String(formData.get("categoria_pai_id") ?? "").trim();
  const categoriaPaiId = categoriaPaiIdBruto || null;
  const ativo = formData.get("ativo") === "on";
  const imagemUrl = String(formData.get("imagem_url") ?? "").trim() || null;

  return { nome, categoriaPaiId, ativo, imagemUrl };
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
    imagem_url: dados.imagemUrl,
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
      imagem_url: dados.imagemUrl,
    })
    .eq("id", id);

  if (error) {
    return { erro: `Erro ao atualizar categoria: ${error.message}` };
  }

  const imagemAnterior = String(formData.get("imagem_url_anterior") ?? "").trim() || null;
  await removerImagemAdminSeOrfa(imagemAnterior, dados.imagemUrl);

  revalidatePath("/admin/categorias");
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
  redirect("/admin/categorias");
}

/**
 * Move uma categoria uma posição pra cima/baixo entre suas IRMÃS (mesma
 * categoria_pai_id) — troca o valor de "ordem" entre ela e a vizinha
 * adjacente. Sem efeito se já for a primeira/última do seu nível.
 */
export async function moverCategoria(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const direcao = Number(formData.get("direcao") ?? 0);
  if (!id || (direcao !== 1 && direcao !== -1)) return;

  const supabase = await criarClienteSupabaseServidor();

  const { data: atual } = await supabase
    .from("categorias")
    .select("id, categoria_pai_id, ordem")
    .eq("id", id)
    .maybeSingle<Pick<Categoria, "id" | "categoria_pai_id" | "ordem">>();

  if (!atual) return;

  let irmasQuery = supabase
    .from("categorias")
    .select("id, ordem, nome")
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });

  irmasQuery =
    atual.categoria_pai_id === null
      ? irmasQuery.is("categoria_pai_id", null)
      : irmasQuery.eq("categoria_pai_id", atual.categoria_pai_id);

  const { data: irmas } = await irmasQuery.returns<Pick<Categoria, "id" | "ordem" | "nome">[]>();
  if (!irmas) return;

  const indiceAtual = irmas.findIndex((irma) => irma.id === id);
  const indiceVizinha = indiceAtual + direcao;
  if (indiceAtual === -1 || indiceVizinha < 0 || indiceVizinha >= irmas.length) return;

  const vizinha = irmas[indiceVizinha];

  await Promise.all([
    supabase.from("categorias").update({ ordem: vizinha.ordem }).eq("id", id),
    supabase.from("categorias").update({ ordem: atual.ordem }).eq("id", vizinha.id),
  ]);

  revalidatePath("/admin/categorias");
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
  revalidatePath("/");
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
