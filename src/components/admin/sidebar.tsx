"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  LifeBuoy,
  Package,
  Tag,
  FolderTree,
  LayoutTemplate,
  Image as ImageIcon,
  Menu as MenuIcon,
  Home,
  Palette,
  Plug,
  Activity,
  ChevronDown,
  X,
  type LucideIcon,
} from "lucide-react";

interface ItemNav {
  rotulo: string;
  href: string;
  icon: LucideIcon;
}

interface GrupoNav {
  rotulo: string;
  icon: LucideIcon;
  filhos: ItemNav[];
}

const ITENS_NAV: ItemNav[] = [
  { rotulo: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { rotulo: "Pedidos", href: "/admin/pedidos", icon: ShoppingCart },
  { rotulo: "Clientes", href: "/admin/clientes", icon: Users },
  { rotulo: "Tickets", href: "/admin/tickets", icon: LifeBuoy },
  { rotulo: "Produtos", href: "/admin/produtos", icon: Package },
  { rotulo: "Marcas", href: "/admin/marcas", icon: Tag },
  { rotulo: "Categorias", href: "/admin/categorias", icon: FolderTree },
];

const GRUPOS_NAV: GrupoNav[] = [
  {
    rotulo: "Conteúdo",
    icon: LayoutTemplate,
    filhos: [
      { rotulo: "Banners", href: "/admin/conteudo/banners", icon: ImageIcon },
      { rotulo: "Menu", href: "/admin/conteudo/menu", icon: MenuIcon },
      { rotulo: "Home", href: "/admin/conteudo/home", icon: Home },
      { rotulo: "Tema", href: "/admin/conteudo/tema", icon: Palette },
    ],
  },
  {
    rotulo: "Integrações",
    icon: Plug,
    filhos: [
      { rotulo: "Status", href: "/admin/integracao", icon: Plug },
      { rotulo: "Eventos", href: "/admin/eventos", icon: Activity },
    ],
  },
];

function itemEstaAtivo(pathname: string, href: string): boolean {
  // Um link com âncora (ex.: "/admin#integracoes") nunca fica "ativo" —
  // ele aponta pra uma seção da MESMA rota do Dashboard, então comparar só
  // o caminho marcaria os dois como ativos ao mesmo tempo.
  if (href.includes("#")) return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function grupoTemFilhoAtivo(pathname: string, grupo: GrupoNav): boolean {
  return grupo.filhos.some((filho) => itemEstaAtivo(pathname, filho.href));
}

interface LinkNavProps {
  item: ItemNav;
  ativo: boolean;
  indentado?: boolean;
  onClick?: () => void;
}

function LinkNav({ item, ativo, indentado = false, onClick }: LinkNavProps) {
  const Icone = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={ativo ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors ${
        indentado ? "pl-9 pr-3" : "px-3"
      } ${
        ativo
          ? "bg-[var(--admin-surface-active)] text-[var(--admin-text)]"
          : "text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)]"
      }`}
    >
      {ativo && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--admin-green)]" />
      )}
      <Icone
        className={`h-[18px] w-[18px] shrink-0 ${ativo ? "text-[var(--admin-green-text)]" : "text-[var(--admin-text-secondary)]"}`}
        strokeWidth={1.75}
      />
      <span className="truncate">{item.rotulo}</span>
    </Link>
  );
}

interface SidebarProps {
  aberto: boolean;
  aoFechar: () => void;
}

export function Sidebar({ aberto, aoFechar }: SidebarProps) {
  const pathname = usePathname();

  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GRUPOS_NAV.map((grupo) => [grupo.rotulo, grupoTemFilhoAtivo(pathname, grupo)])),
  );

  // Fecha o drawer mobile com Esc — mesma expectativa de qualquer painel/modal.
  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") aoFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, aoFechar]);

  function alternarGrupo(rotulo: string) {
    setGruposAbertos((atual) => ({ ...atual, [rotulo]: !atual[rotulo] }));
  }

  const conteudoNav = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {ITENS_NAV.map((item) => (
        <LinkNav key={item.href} item={item} ativo={itemEstaAtivo(pathname, item.href)} onClick={aoFechar} />
      ))}

      {GRUPOS_NAV.map((grupo) => {
        const GrupoIcone = grupo.icon;
        const expandido = gruposAbertos[grupo.rotulo] ?? false;
        const temFilhoAtivo = grupoTemFilhoAtivo(pathname, grupo);

        return (
          <div key={grupo.rotulo} className="pt-1">
            <button
              type="button"
              onClick={() => alternarGrupo(grupo.rotulo)}
              aria-expanded={expandido}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                temFilhoAtivo
                  ? "text-[var(--admin-text)]"
                  : "text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)]"
              }`}
            >
              <GrupoIcone
                className={`h-[18px] w-[18px] shrink-0 ${temFilhoAtivo ? "text-[var(--admin-green-text)]" : "text-[var(--admin-text-secondary)]"}`}
                strokeWidth={1.75}
              />
              <span className="flex-1 truncate text-left">{grupo.rotulo}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${expandido ? "rotate-180" : ""}`}
                strokeWidth={1.75}
              />
            </button>

            {expandido && (
              <div className="relative mt-1 ml-[19px] space-y-1 border-l border-[var(--admin-border)] pl-0">
                {grupo.filhos.map((filho) => (
                  <LinkNav
                    key={filho.href}
                    item={filho}
                    ativo={itemEstaAtivo(pathname, filho.href)}
                    indentado
                    onClick={aoFechar}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Backdrop — só existe (e captura clique) no drawer mobile */}
      {aberto && (
        <button
          aria-label="Fechar menu"
          onClick={aoFechar}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--admin-border)] bg-[var(--admin-chrome)] transition-transform duration-200 lg:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--admin-border)] px-5">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático de public/, sem necessidade de otimização do next/image */}
            <img src="/fhezo-logo.svg" alt="FHEZO Industrial" className="h-7 w-auto shrink-0" />
            <p className="text-[11px] leading-tight text-[var(--admin-text-secondary)]">Painel administrativo</p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar menu"
            className="rounded-md p-1 text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)] lg:hidden"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        {conteudoNav}
      </aside>
    </>
  );
}
