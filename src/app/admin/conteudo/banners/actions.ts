"use server";

import { updateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { DadosBanner, ResultadoPublicacao } from "@/lib/conteudo/tipos";
import type { Banner } from "@/types/database";

export interface EstadoFormularioBanner {
  erro?: string;
}

// Diferente de produtos, banners são versionados (cada publicação vira uma
// linha nova e imutável, histórico nunca é apagado — ver HANDOFF.md). Por
// isso, ao trocar a imagem de um banner, a imagem antiga NÃO é removida do
// Storage aqui: versões antigas em /admin/conteudo/banners/[id]/historico
// continuam apontando pra ela, e apagar quebraria essas imagens no
// histórico. O componente UploadImagem sempre publica um campo oculto
// "imagem_url_anterior", mas esta action deliberadamente não o lê.

function validarDadosBanner(formData: FormData): DadosBanner | { erro: string } {
  const imagem_url = String(formData.get("imagem_url") ?? "").trim();
  if (!imagem_url) return { erro: "A URL da imagem é obrigatória." };

  const link_url = String(formData.get("link_url") ?? "").trim() || null;
  const titulo = String(formData.get("titulo") ?? "").trim() || null;
  const ordem = Number(formData.get("ordem") ?? 0) || 0;
  const ativo = formData.get("ativo") === "on";
  const data_inicio = String(formData.get("data_inicio") ?? "").trim() || null;
  const data_fim = String(formData.get("data_fim") ?? "").trim() || null;

  if (data_inicio && data_fim && data_inicio > data_fim) {
    return { erro: "A data de início não pode ser depois da data de fim." };
  }

  return { imagem_url, link_url, titulo, ordem, ativo, data_inicio, data_fim };
}

async function publicarVersaoBanner(
  bannerId: string | null,
  dados: DadosBanner,
): Promise<{ banner: Banner } | { erro: string }> {
  const supabase = await criarClienteSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .rpc("publicar_banner", { p_banner_id: bannerId, p_dados: dados, p_created_by: user?.id ?? null })
    .single<Banner>();

  if (error || !data) {
    return { erro: `Erro ao salvar banner: ${error?.message ?? "erro desconhecido"}` };
  }

  updateTag("conteudo-banners");
  revalidatePath("/");
  revalidatePath("/admin/conteudo/banners");

  return { banner: data };
}

export async function criarBanner(
  _estadoAnterior: EstadoFormularioBanner,
  formData: FormData,
): Promise<EstadoFormularioBanner> {
  const dados = validarDadosBanner(formData);
  if ("erro" in dados) return dados;

  const resultado = await publicarVersaoBanner(null, dados);
  if ("erro" in resultado) return resultado;

  redirect("/admin/conteudo/banners");
}

export async function atualizarBanner(
  bannerId: string,
  _estadoAnterior: EstadoFormularioBanner,
  formData: FormData,
): Promise<EstadoFormularioBanner> {
  const dados = validarDadosBanner(formData);
  if ("erro" in dados) return dados;

  const resultado = await publicarVersaoBanner(bannerId, dados);
  if ("erro" in resultado) return resultado;

  redirect("/admin/conteudo/banners");
}

export async function alternarAtivoBanner(formData: FormData): Promise<void> {
  const bannerId = String(formData.get("banner_id") ?? "");
  if (!bannerId) return;

  const supabase = await criarClienteSupabaseServidor();
  const { data: atual } = await supabase
    .from("banners")
    .select("dados")
    .eq("banner_id", bannerId)
    .eq("publicado", true)
    .maybeSingle<{ dados: DadosBanner }>();

  if (!atual) return;

  await publicarVersaoBanner(bannerId, { ...atual.dados, ativo: !atual.dados.ativo });
}

export async function restaurarBanner(bannerId: string, versao: number): Promise<ResultadoPublicacao> {
  const supabase = await criarClienteSupabaseServidor();
  const { data: versaoAntiga } = await supabase
    .from("banners")
    .select("dados")
    .eq("banner_id", bannerId)
    .eq("versao", versao)
    .maybeSingle<{ dados: DadosBanner }>();

  if (!versaoAntiga) return { sucesso: false, erro: "Versão não encontrada." };

  const resultado = await publicarVersaoBanner(bannerId, versaoAntiga.dados);
  if ("erro" in resultado) return { sucesso: false, erro: resultado.erro };

  revalidatePath(`/admin/conteudo/banners/${bannerId}/historico`);
  return { sucesso: true, versao: resultado.banner.versao };
}
