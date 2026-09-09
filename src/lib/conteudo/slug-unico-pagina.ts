import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { gerarSlug } from "@/lib/categorias/hierarquia";

/**
 * Garante um slug único para paginas_institucionais, acrescentando um
 * sufixo numérico em caso de colisão — mesma lógica de
 * src/lib/categorias/slug-unico.ts, adaptada para outra tabela.
 */
export async function gerarSlugUnicoPagina(
  supabase: SupabaseClient,
  titulo: string,
  idParaIgnorar?: string,
): Promise<string> {
  const base = gerarSlug(titulo) || "pagina";
  let candidato = base;
  let sufixo = 2;

  for (;;) {
    let query = supabase.from("paginas_institucionais").select("id").eq("slug", candidato);
    if (idParaIgnorar) query = query.neq("id", idParaIgnorar);
    const { data } = await query.maybeSingle<{ id: string }>();
    if (!data) return candidato;
    candidato = `${base}-${sufixo}`;
    sufixo++;
  }
}
