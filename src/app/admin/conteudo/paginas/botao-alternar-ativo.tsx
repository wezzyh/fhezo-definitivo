"use client";

import { alternarAtivoPagina } from "./actions";

interface BotaoAlternarAtivoPaginaProps {
  id: string;
  ativo: boolean;
}

export function BotaoAlternarAtivoPagina({ id, ativo }: BotaoAlternarAtivoPaginaProps) {
  return (
    <form action={alternarAtivoPagina}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="ativo" value={String(ativo)} />
      <button type="submit" className="text-sm font-medium text-[var(--admin-green-text)] hover:underline">
        {ativo ? "Desativar" : "Ativar"}
      </button>
    </form>
  );
}
