"use server";

import { updateTag, revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { DadosMenu, ItemMenu, ResultadoPublicacao } from "@/lib/conteudo/tipos";
import type { ConteudoSite } from "@/types/database";

function validarItens(itens: ItemMenu[]): string | null {
  for (const item of itens) {
    if (!item.rotulo.trim()) return "Todo item de menu precisa de um rótulo.";
    if (item.tipo === "categoria" && !item.categoria_id) return `Selecione a categoria para "${item.rotulo}".`;
    if (item.tipo === "link" && !item.href?.trim()) return `Informe o link para "${item.rotulo}".`;
    const erroFilhos = validarItens(item.filhos);
    if (erroFilhos) return erroFilhos;
  }
  return null;
}

export async function publicarMenu(dados: DadosMenu): Promise<ResultadoPublicacao> {
  const erro = validarItens(dados.itens);
  if (erro) return { sucesso: false, erro };

  const supabase = await criarClienteSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .rpc("publicar_conteudo_site", { p_tipo: "menu", p_dados: dados, p_created_by: user?.id ?? null })
    .single<ConteudoSite>();

  if (error || !data) {
    return { sucesso: false, erro: `Erro ao publicar menu: ${error?.message ?? "erro desconhecido"}` };
  }

  updateTag("conteudo-menu");
  revalidatePath("/");
  revalidatePath("/admin/conteudo/menu");

  return { sucesso: true, versao: data.versao };
}

export async function restaurarMenu(versao: number): Promise<ResultadoPublicacao> {
  const supabase = await criarClienteSupabaseServidor();
  const { data: versaoAntiga } = await supabase
    .from("conteudo_site")
    .select("dados")
    .eq("tipo", "menu")
    .eq("versao", versao)
    .maybeSingle<{ dados: DadosMenu }>();

  if (!versaoAntiga) return { sucesso: false, erro: "Versão não encontrada." };
  return publicarMenu(versaoAntiga.dados);
}
