import type { ReactNode } from "react";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";

// Layout compartilhado por todas as páginas dentro de /admin.
// O proxy (src/proxy.ts) já garante que só se chega até aqui autenticado,
// exceto na própria página de login — por isso, quando não há usuário
// logado, apenas renderizamos o conteúdo (a tela de login) sem a casca
// do painel (sidebar/header, ver AdminShell).
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await criarClienteSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  return <AdminShell userEmail={user.email ?? null}>{children}</AdminShell>;
}
