import { createClient } from "@supabase/supabase-js";

// Cliente Supabase para uso em Client Components (código que roda no navegador).
// As variáveis NEXT_PUBLIC_* ficam expostas ao browser por definição do Next.js,
// por isso aqui só usamos a chave "anon" (pública), nunca a service_role.
const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const chaveAnonimaSupabase = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseNavegador = createClient(urlSupabase, chaveAnonimaSupabase);
