"use client";

import { alternarAtivoMarca } from "./actions";

interface BotaoAlternarAtivoMarcaProps {
  id: string;
  ativo: boolean;
}

export function BotaoAlternarAtivoMarca({ id, ativo }: BotaoAlternarAtivoMarcaProps) {
  return (
    <form action={alternarAtivoMarca}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="ativo" value={String(ativo)} />
      <button type="submit" className="text-sm font-medium text-[var(--admin-green-text)] hover:underline">
        {ativo ? "Desativar" : "Ativar"}
      </button>
    </form>
  );
}
