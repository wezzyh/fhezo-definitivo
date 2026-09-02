import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente Supabase para uso em Server Components, Server Actions e Route
// Handlers. Usa @supabase/ssr para ler/gravar a sessão do usuário via
// cookies, mantendo o login sincronizado entre navegador e servidor.
export async function criarClienteSupabaseServidor() {
  const cookieStore = await cookies();

  const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const chaveAnonimaSupabase = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(urlSupabase, chaveAnonimaSupabase, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaDefinir) {
        try {
          cookiesParaDefinir.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` foi chamado a partir de um Server Component, que não
          // pode alterar cookies. Pode ser ignorado com segurança aqui
          // porque o middleware já cuida de renovar a sessão do usuário.
        }
      },
    },
  });
}
