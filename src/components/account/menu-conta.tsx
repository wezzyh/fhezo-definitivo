"use client";

import { CaretDown, Cube, SignOut, UserCircle } from "@phosphor-icons/react";
import { useState } from "react";
import Link from "next/link";
import { sairCliente } from "@/app/(site)/conta/actions";

interface MenuContaProps {
  /** null = ninguém logado. Ver src/lib/clientes/sessao.ts. */
  cliente: { primeiroNome: string } | null;
}

// Baseado visualmente em
// referencia-novo-frontend/src/components/account/AccountMenu.tsx (Link
// do react-router-dom trocado por next/link), mas agora conectado à sessão
// real de cliente (ver obterClienteLogado, passado pelo Header) em vez do
// estado decorativo de "visitante" fixo da referência. Deslogado: vira um
// link direto pra /login (sem dropdown — não há nada de sessão pra
// mostrar). "Meus desejos" da referência foi removido: não existe recurso
// de lista de desejos no projeto, manter o botão seria um item morto.
export function MenuConta({ cliente }: MenuContaProps) {
  const [open, setOpen] = useState(false);

  if (!cliente) {
    return (
      <Link
        href="/login"
        className="
          flex items-center gap-2
          text-white
          focus-fhezo
        "
      >
        <UserCircle size={29} weight="regular" />

        <div className="hidden xl:block text-left leading-tight">
          <span className="block text-[12px] text-ink-300">Olá, visitante</span>

          <span className="font-semibold text-[14px]">Entrar</span>
        </div>
      </Link>
    );
  }

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
          <span className="block text-[12px] text-ink-300">Olá, {cliente.primeiroNome}</span>

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
              Olá, <strong>{cliente.primeiroNome}</strong>
            </p>
          </div>

          <div className="p-3">
            <Link
              href="/conta"
              onClick={() => setOpen(false)}
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

            <Link
              href="/conta#pedidos"
              onClick={() => setOpen(false)}
              className="
                flex items-center gap-4
                rounded-fhezo
                px-3 py-3
                text-sm text-ink-700
                transition
                hover:bg-warm-100
              "
            >
              <Cube size={22} />
              Meus Pedidos
            </Link>
          </div>

          <div className="border-t border-ink-200 p-3">
            <form action={sairCliente}>
              <button
                type="submit"
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
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
