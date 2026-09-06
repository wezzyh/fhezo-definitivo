"use client";

import { CaretDown, Cube, Heart, SignOut, UserCircle } from "@phosphor-icons/react";
import { useState } from "react";
import Link from "next/link";

// Copiado literalmente de
// referencia-novo-frontend/src/components/account/AccountMenu.tsx
// (Link do react-router-dom trocado por next/link). Não há sistema de
// login de cliente no projeto (autenticação fica fora de escopo desta
// integração) — mantido exatamente como na referência: um menu decorativo
// de "visitante", sem estado real de sessão.
export function MenuConta() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="
          flex items-center gap-2
          text-white
          focus-fhezo
        "
      >
        <UserCircle size={29} weight="regular" />

        <div className="hidden xl:block text-left leading-tight">
          <span className="block text-[12px] text-ink-300">Olá, visitante</span>

          <span className="font-semibold text-[14px]">Minha conta</span>
        </div>

        <CaretDown size={14} className="hidden xl:block" />
      </button>

      {open && (
        <div
          className="
            absolute right-0 top-[48px]
            z-[80]
            w-[305px]
            rounded-fhezo
            border border-ink-200
            bg-white
            shadow-panel
          "
        >
          <div className="border-b border-ink-200 px-5 py-4">
            <p className="text-base text-ink-700">
              Olá, <strong>Visitante</strong>
            </p>
          </div>

          <div className="p-3">
            <Link
              href="/conta"
              className="
                flex items-center gap-4
                rounded-fhezo
                px-3 py-3
                text-sm text-ink-700
                transition
                hover:bg-warm-100
              "
            >
              <UserCircle size={23} />
              Minha Conta
            </Link>

            <button
              className="
                flex w-full items-center gap-4
                rounded-fhezo
                px-3 py-3
                text-sm text-ink-700
                transition
                hover:bg-warm-100
              "
            >
              <Cube size={22} />
              Meus Pedidos
            </button>

            <button
              className="
                flex w-full items-center gap-4
                rounded-fhezo
                px-3 py-3
                text-sm text-ink-700
                transition
                hover:bg-warm-100
              "
            >
              <Heart size={22} />
              Meus desejos
            </button>
          </div>

          <div className="border-t border-ink-200 p-3">
            <button
              onClick={() => setOpen(false)}
              className="
                flex w-full items-center gap-4
                rounded-fhezo
                px-3 py-3
                text-sm text-ink-700
                transition
                hover:bg-warm-100
              "
            >
              <SignOut size={22} />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
