"use server";

import { updateTag, revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { DadosContato, ResultadoPublicacao } from "@/lib/conteudo/tipos";
import type { ConteudoSite } from "@/types/database";

function validarContato(dados: DadosContato): string | null {
  if (!dados.telefone.trim()) return "O telefone é obrigatório.";
  if (!dados.whatsapp.trim()) return "O WhatsApp é obrigatório.";
  if (!dados.email.trim() || !dados.email.includes("@")) return "Informe um e-mail válido.";
  if (!dados.endereco.trim()) return "O endereço é obrigatório.";
  return null;
}

export async function publicarContato(dados: DadosContato): Promise<ResultadoPublicacao> {
  const erro = validarContato(dados);
  if (erro) return { sucesso: false, erro };

  const supabase = await criarClienteSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .rpc("publicar_conteudo_site", { p_tipo: "contato", p_dados: dados, p_created_by: user?.id ?? null })
    .single<ConteudoSite>();

  if (error || !data) {
    return { sucesso: false, erro: `Erro ao publicar contato: ${error?.message ?? "erro desconhecido"}` };
  }

  updateTag("conteudo-contato");
  revalidatePath("/", "layout");
  revalidatePath("/admin/conteudo/contato");

  return { sucesso: true, versao: data.versao };
}

export async function restaurarContato(versao: number): Promise<ResultadoPublicacao> {
  const supabase = await criarClienteSupabaseServidor();
  const { data: versaoAntiga } = await supabase
    .from("conteudo_site")
    .select("dados")
    .eq("tipo", "contato")
    .eq("versao", versao)
    .maybeSingle<{ dados: DadosContato }>();

  if (!versaoAntiga) return { sucesso: false, erro: "Versão não encontrada." };
  return publicarContato(versaoAntiga.dados);
}
