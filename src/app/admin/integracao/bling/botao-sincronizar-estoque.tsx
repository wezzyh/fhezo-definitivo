"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sincronizarEstoqueBling } from "./actions";

export function BotaoSincronizarEstoqueBling() {
  const [sincronizando, setSincronizando] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    mensagem?: string;
    atualizados?: number;
    naoEncontradosNoSite?: string[];
  } | null>(null);

  async function lidarComClique() {
    setSincronizando(true);
    setResultado(null);
    const resposta = await sincronizarEstoqueBling();
    setSincronizando(false);
    setResultado(resposta);
  }

  return (
    <div>
      <Button type="button" variant="outline" disabled={sincronizando} onClick={lidarComClique}>
        {sincronizando ? "Sincronizando..." : "Sincronizar estoque com Bling"}
      </Button>

      {resultado && !resultado.sucesso && (
        <p className="mt-2 text-sm text-red-600">{resultado.mensagem}</p>
      )}

      {resultado?.sucesso && (
        <div className="mt-2 text-sm">
          <p className="text-brand-green-dark">
            {resultado.atualizados} produto(s) tiveram o estoque atualizado.
          </p>
          {resultado.naoEncontradosNoSite && resultado.naoEncontradosNoSite.length > 0 && (
            <div className="mt-2 rounded-md bg-zinc-50 p-3">
              <p className="font-medium text-ink">
                {resultado.naoEncontradosNoSite.length} produto(s) no Bling não sincronizado(s) (sem SKU
                correspondente no site — nada foi criado automaticamente):
              </p>
              <ul className="mt-1 list-inside list-disc text-muted">
                {resultado.naoEncontradosNoSite.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
