"use server";

import { updateTag, revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { DadosSeo, ResultadoPublicacao } from "@/lib/conteudo/tipos";
import type { ConteudoSite } from "@/types/database";

function validarSeo(dados: DadosSeo): string | null {
  if (!dados.home.titulo.trim()) return "O título da Home é obrigatório.";
  if (!dados.produtos.titulo.trim()) return "O título da listagem de produtos é obrigatório.";
  return null;
}

export async function publicarSeo(dados: DadosSeo): Promise<ResultadoPublicacao> {
  const erro = validarSeo(dados);
  if (erro) return { sucesso: false, erro };

  const supabase = await criarClienteSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .rpc("publicar_conteudo_site", { p_tipo: "seo", p_dados: dados, p_created_by: user?.id ?? null })
    .single<ConteudoSite>();

  if (error || !data) {
    return { sucesso: false, erro: `Erro ao publicar SEO: ${error?.message ?? "erro desconhecido"}` };
  }

  updateTag("conteudo-seo");
  revalidatePath("/", "layout");
  revalidatePath("/admin/conteudo/seo");

  return { sucesso: true, versao: data.versao };
}

export async function restaurarSeo(versao: number): Promise<ResultadoPublicacao> {
  const supabase = await criarClienteSupabaseServidor();
  const { data: versaoAntiga } = await supabase
    .from("conteudo_site")
    .select("dados")
    .eq("tipo", "seo")
    .eq("versao", versao)
    .maybeSingle<{ dados: DadosSeo }>();

  if (!versaoAntiga) return { sucesso: false, erro: "Versão não encontrada." };
  return publicarSeo(versaoAntiga.dados);
}
