"use client";

import type { IdEtapa } from "@/lib/clientes/cadastro/esquemas";

export const TITULOS_ETAPAS: Record<IdEtapa, string> = {
  acesso: "Acesso",
  identificacao: "Identificação",
  fiscal: "Dados fiscais",
  endereco: "Endereço",
  revisao: "Revisão",
};

interface IndicadorEtapasProps {
  etapas: IdEtapa[];
  atual: number;
  /** Só etapas já concluídas (antes da atual) são clicáveis. */
  aoIrPara: (etapa: IdEtapa) => void;
}

/**
 * No celular vira só "Etapa 2 de 5" + barra (uma trilha com 5 bolinhas e
 * rótulos não cabe em 360px sem ficar ilegível). A partir de sm, trilha
 * completa com aria-current="step" na etapa ativa.
 */
export function IndicadorEtapas({ etapas, atual, aoIrPara }: IndicadorEtapasProps) {
  return (
    <nav aria-label="Progresso do cadastro">
      <div className="sm:hidden">
        <p className="text-sm text-muted">
          Etapa {atual + 1} de {etapas.length}:{" "}
          <span className="font-medium text-ink">{TITULOS_ETAPAS[etapas[atual]]}</span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200" aria-hidden="true">
          <div
            className="h-full rounded-full bg-brand-green transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${((atual + 1) / etapas.length) * 100}%` }}
          />
        </div>
      </div>

      <ol
        className="hidden gap-2 sm:grid"
        style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }}
      >
        {etapas.map((etapa, indice) => {
          const concluida = indice < atual;
          const ativa = indice === atual;
          const conteudo = (
            <>
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  ativa
                    ? "bg-brand-green text-white"
                    : concluida
                      ? "bg-brand-green/15 text-brand-green-dark"
                      : "border border-zinc-300 text-muted"
                }`}
              >
                {concluida ? "✓" : indice + 1}
              </span>
              <span className={`text-xs ${ativa ? "font-semibold text-ink" : "text-muted"}`}>
                {TITULOS_ETAPAS[etapa]}
                {concluida && <span className="sr-only"> (concluída)</span>}
              </span>
            </>
          );

          return (
            <li key={etapa} aria-current={ativa ? "step" : undefined} className="flex justify-center">
              {concluida ? (
                <button
                  type="button"
                  onClick={() => aoIrPara(etapa)}
                  className="flex min-h-11 flex-col items-center gap-1 rounded-md px-1 text-center outline-none hover:[&>span:last-child]:text-ink focus-visible:ring-2 focus-visible:ring-brand-green"
                >
                  {conteudo}
                </button>
              ) : (
                <span className="flex min-h-11 flex-col items-center gap-1 px-1 text-center">{conteudo}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
