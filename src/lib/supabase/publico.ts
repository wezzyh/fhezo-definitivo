import { createClient } from "@supabase/supabase-js";

// Cliente Supabase anônimo, sem vínculo com cookies/sessão — para uso
// dentro de funções cacheadas com `unstable_cache` do Next.js, que proíbem
// chamar APIs dinâmicas (como cookies()) no corpo da função cacheada. Só
// faz sentido para leituras públicas já protegidas por RLS para o papel
// "anon" (ex.: conteúdo publicado em conteudo_site/banners).
export function criarClienteSupabasePublico() {
  const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const chaveAnonimaSupabase = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(urlSupabase, chaveAnonimaSupabase, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
