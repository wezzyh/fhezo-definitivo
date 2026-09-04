"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { HeaderAdmin } from "./header";

interface AdminShellProps {
  userEmail: string | null;
  children: ReactNode;
}

// Casca visual de todo o /admin autenticado: sidebar fixa (drawer no
// mobile) + header + área de conteúdo. `data-admin-theme` aqui é o único
// lugar que ativa os tokens de src/app/globals.css — nada fora desta
// árvore os enxerga.
export function AdminShell({ userEmail, children }: AdminShellProps) {
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  return (
    <div data-admin-theme="" className="min-h-screen bg-[var(--admin-bg)]">
      <Sidebar aberto={menuMobileAberto} aoFechar={() => setMenuMobileAberto(false)} />

      <div className="flex min-h-screen flex-col lg:pl-64">
        <HeaderAdmin userEmail={userEmail} aoAbrirMenu={() => setMenuMobileAberto(true)} />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {/*
        Alvo do createPortal do Modal (ver src/components/ui/modal.tsx).
        Sem isso, o portal iria direto para document.body — FORA desta div
        com data-admin-theme — e nenhuma variável --admin-* chegaria até o
        modal (CSS custom properties seguem a árvore DOM, não a árvore
        React; um portal escapa da árvore DOM mesmo continuando dentro da
        árvore React). Ficar dentro daqui resolve isso sem precisar tocar
        em document.body diretamente.
      */}
      <div id="admin-modal-root" />
    </div>
  );
}
