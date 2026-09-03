"use server";

import { updateTag, revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { DadosTema, ResultadoPublicacao } from "@/lib/conteudo/tipos";
import type { ConteudoSite } from "@/types/database";

const REGEX_HEX = /^#[0-9a-fA-F]{3,8}$/;

function validarCores(cores: DadosTema["cores"]): string | null {
  for (const [chave, valor] of Object.entries(cores)) {
    if (!REGEX_HEX.test(valor)) return `Cor inválida para "${chave}": use um código hexadecimal (ex.: #009b6c).`;
  }
  return null;
}

export async function publicarTema(dados: DadosTema): Promise<ResultadoPublicacao> {
  const erro = validarCores(dados.cores);
  if (erro) return { sucesso: false, erro };

  const supabase = await criarClienteSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .rpc("publicar_conteudo_site", { p_tipo: "tema", p_dados: dados, p_created_by: user?.id ?? null })
    .single<ConteudoSite>();

  if (error || !data) {
    return { sucesso: false, erro: `Erro ao publicar tema: ${error?.message ?? "erro desconhecido"}` };
  }

  updateTag("conteudo-tema");
  revalidatePath("/", "layout");
  revalidatePath("/admin/conteudo/tema");

  return { sucesso: true, versao: data.versao };
}

export async function restaurarTema(versao: number): Promise<ResultadoPublicacao> {
  const supabase = await criarClienteSupabaseServidor();
  const { data: versaoAntiga } = await supabase
    .from("conteudo_site")
    .select("dados")
    .eq("tipo", "tema")
    .eq("versao", versao)
    .maybeSingle<{ dados: DadosTema }>();

  if (!versaoAntiga) return { sucesso: false, erro: "Versão não encontrada." };
  return publicarTema(versaoAntiga.dados);
}
