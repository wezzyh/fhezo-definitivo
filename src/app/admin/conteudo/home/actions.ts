"use server";

import { updateTag, revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { DadosHome, ResultadoPublicacao } from "@/lib/conteudo/tipos";
import type { ConteudoSite } from "@/types/database";

function validarSecoes(secoes: DadosHome["secoes"]): string | null {
  for (const secao of secoes) {
    if (secao.tipo === "categorias_destaque" && secao.categoria_ids.length === 0) {
      return `Selecione ao menos uma categoria em "${secao.titulo || "Categorias em destaque"}".`;
    }
    if (secao.tipo === "produtos_destaque" && secao.modo === "manual" && secao.produto_ids.length === 0) {
      return `Selecione ao menos um produto em "${secao.titulo || "Produtos em destaque"}".`;
    }
  }
  return null;
}

export async function publicarHome(dados: DadosHome): Promise<ResultadoPublicacao> {
  const erro = validarSecoes(dados.secoes);
  if (erro) return { sucesso: false, erro };

  const supabase = await criarClienteSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .rpc("publicar_conteudo_site", { p_tipo: "home", p_dados: dados, p_created_by: user?.id ?? null })
    .single<ConteudoSite>();

  if (error || !data) {
    return { sucesso: false, erro: `Erro ao publicar home: ${error?.message ?? "erro desconhecido"}` };
  }

  updateTag("conteudo-home");
  revalidatePath("/");
  revalidatePath("/admin/conteudo/home");

  return { sucesso: true, versao: data.versao };
}

export async function restaurarHome(versao: number): Promise<ResultadoPublicacao> {
  const supabase = await criarClienteSupabaseServidor();
  const { data: versaoAntiga } = await supabase
    .from("conteudo_site")
    .select("dados")
    .eq("tipo", "home")
    .eq("versao", versao)
    .maybeSingle<{ dados: DadosHome }>();

  if (!versaoAntiga) return { sucesso: false, erro: "Versão não encontrada." };
  return publicarHome(versaoAntiga.dados);
}
