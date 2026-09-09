"use client";

import { moverMarca } from "./actions";

interface BotaoMoverMarcaProps {
  id: string;
  podeSubir: boolean;
  podeDescer: boolean;
}

export function BotaoMoverMarca({ id, podeSubir, podeDescer }: BotaoMoverMarcaProps) {
  return (
    <div className="flex items-center gap-1">
      <form action={moverMarca}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direcao" value="-1" />
        <button
          type="submit"
          disabled={!podeSubir}
          className="px-1 text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] disabled:opacity-30"
          aria-label="Mover para cima"
        >
          ▲
        </button>
      </form>
      <form action={moverMarca}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direcao" value="1" />
        <button
          type="submit"
          disabled={!podeDescer}
          className="px-1 text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] disabled:opacity-30"
          aria-label="Mover para baixo"
        >
          ▼
        </button>
      </form>
    </div>
  );
}
