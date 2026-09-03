import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { gerarSlug } from "./hierarquia";

// Separado de hierarquia.ts (que é importado por componentes client, ex.:
// formulario-categoria.tsx) porque esta função faz consulta ao banco —
// "server-only" quebraria aqueles imports client-side.

/**
 * Garante um slug único, acrescentando um sufixo numérico em caso de
 * colisão. Reaproveitada pelo CRUD de categorias (src/app/admin/categorias/actions.ts)
 * e pela importação em massa (src/lib/produtos/importacao.ts).
 */
export async function gerarSlugUnico(
  supabase: SupabaseClient,
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
