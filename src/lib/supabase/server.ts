import { createClient } from "@supabase/supabase-js";

// Cliente Supabase para uso em Server Components e Route Handlers.
// Criamos uma instância nova a cada chamada para evitar compartilhar estado
// entre requisições diferentes no servidor.
//
// TODO: quando a autenticação real (login de admin) for implementada,
// migrar para o pacote @supabase/ssr para propagar corretamente os cookies
// de sessão entre o navegador e o servidor.
export function criarClienteSupabaseServidor() {
  const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const chaveAnonimaSupabase = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(urlSupabase, chaveAnonimaSupabase, {
    auth: {
      persistSession: false,
    },
  });
}
