"use client";

import { Basket } from "@phosphor-icons/react";
import { useCarrinho } from "@/lib/carrinho/contexto";

// Etapa 3 da integração do novo frontend (ver HANDOFF.md): abre o drawer
// (CarrinhoDrawer, montado em src/app/(site)/layout.tsx) em vez de navegar
// pra /carrinho — a rota cheia foi removida junto com esta mudança.
export function IndicadorCarrinho() {
  const { quantidadeTotal, abrirCarrinho } = useCarrinho();

  return (
    <button
      type="button"
      onClick={abrirCarrinho}
      className="relative flex h-[48px] w-[48px] items-center justify-center rounded-fhezo bg-white/[.055] text-white transition hover:bg-white/[.1]"
      aria-label="Abrir carrinho"
    >
      <Basket size={25} />

      {quantidadeTotal > 0 && (
        <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-fhezo-400 px-1 text-xs font-bold text-ink-950">
          {quantidadeTotal}
        </span>
      )}
    </button>
  );
}
