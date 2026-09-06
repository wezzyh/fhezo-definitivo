"use client";

import { usePathname } from "next/navigation";
import { Menu as MenuIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sairAdmin } from "@/app/admin/actions";

// Título contextual derivado da rota — mais específico primeiro, "/admin"
// por último (senão ele "vence" qualquer sub-rota via startsWith).
const TITULOS_POR_ROTA: { prefixo: string; titulo: string; grupo?: string }[] = [
  { prefixo: "/admin/pedidos", titulo: "Pedidos" },
  { prefixo: "/admin/clientes", titulo: "Clientes" },
  { prefixo: "/admin/tickets", titulo: "Tickets de suporte" },
  { prefixo: "/admin/produtos", titulo: "Produtos" },
  { prefixo: "/admin/marcas", titulo: "Marcas" },
  { prefixo: "/admin/categorias", titulo: "Categorias" },
  { prefixo: "/admin/conteudo/banners", titulo: "Banners", grupo: "Conteúdo" },
  { prefixo: "/admin/conteudo/menu", titulo: "Menu", grupo: "Conteúdo" },
  { prefixo: "/admin/conteudo/home", titulo: "Home", grupo: "Conteúdo" },
  { prefixo: "/admin/conteudo/tema", titulo: "Tema", grupo: "Conteúdo" },
  { prefixo: "/admin/conteudo/footer", titulo: "Footer", grupo: "Conteúdo" },
  { prefixo: "/admin/integracao", titulo: "Status das integrações", grupo: "Integrações" },
  { prefixo: "/admin/eventos", titulo: "Eventos de integração", grupo: "Integrações" },
  { prefixo: "/admin/login", titulo: "Login" },
  { prefixo: "/admin", titulo: "Dashboard" },
];

function tituloDaRota(pathname: string): { titulo: string; grupo?: string } {
  const encontrado = TITULOS_POR_ROTA.find(
    (item) => pathname === item.prefixo || pathname.startsWith(`${item.prefixo}/`),
  );
  return encontrado ?? { titulo: "Painel" };
}

interface HeaderAdminProps {
  userEmail: string | null;
  aoAbrirMenu: () => void;
}

export function HeaderAdmin({ userEmail, aoAbrirMenu }: HeaderAdminProps) {
  const pathname = usePathname();
  const { titulo, grupo } = tituloDaRota(pathname);
  const inicial = (userEmail?.trim()?.[0] ?? "A").toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b border-[var(--admin-border)] bg-[var(--admin-chrome)] px-4 lg:px-8">
      <button
        type="button"
        onClick={aoAbrirMenu}
        aria-label="Abrir menu"
        className="rounded-md p-1.5 text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)] lg:hidden"
      >
        <MenuIcon className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <div className="min-w-0 leading-tight">
        {grupo && <p className="truncate text-xs text-[var(--admin-text-secondary)]">{grupo}</p>}
        <h1 className="truncate text-base font-semibold text-[var(--admin-text)]">{titulo}</h1>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <div className="hidden items-center gap-2.5 sm:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--admin-green)] text-xs font-semibold text-white">
            {inicial}
          </span>
          <div className="leading-tight">
            <p className="max-w-[180px] truncate text-sm text-[var(--admin-text)]">{userEmail ?? "Administrador"}</p>
            <p className="text-xs text-[var(--admin-text-secondary)]">Administrador</p>
          </div>
        </div>

        <form action={sairAdmin}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
