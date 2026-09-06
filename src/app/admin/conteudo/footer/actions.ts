"use server";

import { updateTag, revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { DadosFooter, ResultadoPublicacao } from "@/lib/conteudo/tipos";
import type { ConteudoSite } from "@/types/database";

export async function publicarFooter(dados: DadosFooter): Promise<ResultadoPublicacao> {
  const supabase = await criarClienteSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .rpc("publicar_conteudo_site", { p_tipo: "footer", p_dados: dados, p_created_by: user?.id ?? null })
    .single<ConteudoSite>();

  if (error || !data) {
    return { sucesso: false, erro: `Erro ao publicar footer: ${error?.message ?? "erro desconhecido"}` };
  }

  updateTag("conteudo-footer");
  revalidatePath("/");
  revalidatePath("/admin/conteudo/footer");

  return { sucesso: true, versao: data.versao };
}

export async function restaurarFooter(versao: number): Promise<ResultadoPublicacao> {
  const supabase = await criarClienteSupabaseServidor();
  const { data: versaoAntiga } = await supabase
    .from("conteudo_site")
    .select("dados")
    .eq("tipo", "footer")
    .eq("versao", versao)
    .maybeSingle<{ dados: DadosFooter }>();

  if (!versaoAntiga) return { sucesso: false, erro: "Versão não encontrada." };
  return publicarFooter(versaoAntiga.dados);
}
