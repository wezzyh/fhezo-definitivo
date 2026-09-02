"use client";

import Link from "next/link";
import { useCarrinho } from "@/lib/carrinho/contexto";

export function IndicadorCarrinho() {
  const { quantidadeTotal } = useCarrinho();

  return (
    <Link
      href="/carrinho"
      className="flex shrink-0 items-center gap-2 text-sm font-medium text-white hover:text-brand-green"
    >
      Carrinho
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-xs font-medium text-white">
        {quantidadeTotal}
      </span>
    </Link>
  );
}
