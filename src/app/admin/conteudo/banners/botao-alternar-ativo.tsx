"use client";

import { alternarAtivoBanner } from "./actions";

export function BotaoAlternarAtivoBanner({ bannerId, ativo }: { bannerId: string; ativo: boolean }) {
  return (
    <form action={alternarAtivoBanner}>
      <input type="hidden" name="banner_id" value={bannerId} />
      <button type="submit" className="text-sm font-medium text-[var(--admin-green-text)] hover:underline">
        {ativo ? "Desativar" : "Ativar"}
      </button>
    </form>
  );
}
