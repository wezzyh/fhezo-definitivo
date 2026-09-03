"use client";

import { alternarAtivoCategoria } from "./actions";

interface BotaoAlternarAtivoCategoriaProps {
  id: string;
  ativo: boolean;
}

export function BotaoAlternarAtivoCategoria({ id, ativo }: BotaoAlternarAtivoCategoriaProps) {
  return (
    <form action={alternarAtivoCategoria}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="ativo" value={String(ativo)} />
      <button type="submit" className="text-sm font-medium text-brand-green hover:underline">
        {ativo ? "Desativar" : "Ativar"}
      </button>
    </form>
  );
}
