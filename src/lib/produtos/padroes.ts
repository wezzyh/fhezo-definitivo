import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// Marca/categoria padrão usadas quando a sincronização com o Bling cria um
// produto novo automaticamente (sempre inativo, aguardando revisão manual
// — ver sincronizarEstoqueBling em src/app/admin/integracao/bling/actions.ts).
// Ambas são registros normais em "marcas"/"categorias" (não texto solto);
// essas funções garantem que existem, criando na primeira vez que forem
// necessárias.

const NOME_MARCA_PADRAO = "Sem marca";
const NOME_CATEGORIA_PADRAO = "Sem categoria";
const SLUG_CATEGORIA_PADRAO = "sem-categoria";

export async function obterOuCriarMarcaPadrao(supabase: SupabaseClient): Promise<string> {
  const { data: existente } = await supabase
    .from("marcas")
    .select("id")
    .eq("nome", NOME_MARCA_PADRAO)
    .maybeSingle<{ id: string }>();

  if (existente) return existente.id;

  const { data: nova, error } = await supabase
    .from("marcas")
    .insert({ nome: NOME_MARCA_PADRAO, ativo: true })
    .select("id")
    .single<{ id: string }>();

  if (error || !nova) {
    throw new Error(`Não foi possível criar a marca padrão: ${error?.message ?? "erro desconhecido"}`);
  }

  return nova.id;
}

export async function obterOuCriarCategoriaPadrao(supabase: SupabaseClient): Promise<string> {
  const { data: existente } = await supabase
    .from("categorias")
    .select("id")
    .eq("slug", SLUG_CATEGORIA_PADRAO)
    .maybeSingle<{ id: string }>();

  if (existente) return existente.id;

  const { data: nova, error } = await supabase
    .from("categorias")
    .insert({ nome: NOME_CATEGORIA_PADRAO, slug: SLUG_CATEGORIA_PADRAO, ativo: true })
    .select("id")
    .single<{ id: string }>();

  if (error || !nova) {
    throw new Error(
      `Não foi possível criar a categoria padrão: ${error?.message ?? "erro desconhecido"}`,
    );
  }

  return nova.id;
}
