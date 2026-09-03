"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sincronizarEstoqueBling, type ProdutoCriadoResumo } from "./actions";

export function BotaoSincronizarEstoqueBling() {
  const [sincronizando, setSincronizando] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: boolean;
    mensagem?: string;
    atualizados?: number;
    criados?: ProdutoCriadoResumo[];
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
          {resultado.criados && resultado.criados.length > 0 && (
            <div className="mt-2 rounded-md bg-zinc-50 p-3">
              <p className="font-medium text-ink">
                {resultado.criados.length} produto(s) novo(s) criado(s) a partir do Bling — inativos,
                aguardando sua revisão em /admin/produtos antes de aparecerem na loja:
              </p>
              <ul className="mt-1 list-inside list-disc text-muted">
                {resultado.criados.map((produto) => (
                  <li key={produto.sku}>
                    {produto.sku} — {produto.nome}
                    {produto.precoZerado && (
                      <span className="ml-1 font-medium text-amber-700">
                        (preço veio zerado do Bling — revisar)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
