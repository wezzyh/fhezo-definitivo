import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { sairAdmin } from "./actions";

// Layout compartilhado por todas as páginas dentro de /admin.
// O proxy (src/proxy.ts) já garante que só se chega até aqui autenticado,
// exceto na própria página de login — por isso, quando não há usuário
// logado, apenas renderizamos o conteúdo (a tela de login) sem o cabeçalho
// do painel.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await criarClienteSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold text-ink">Painel Administrativo — FHEZO</span>
            <nav className="flex gap-4 text-sm font-medium text-muted">
              <Link href="/admin" className="hover:text-brand-green">
                Dashboard
              </Link>
              <Link href="/admin/produtos" className="hover:text-brand-green">
                Produtos
              </Link>
            </nav>
          </div>
          <form action={sairAdmin}>
            <Button type="submit" variant="outline">
              Sair
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
