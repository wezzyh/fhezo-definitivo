"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCarrinho } from "@/lib/carrinho/contexto";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PaginaCarrinho() {
  const { itens, subtotal, removerItem, alterarQuantidade } = useCarrinho();

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-semibold text-ink">Carrinho de compras</h1>

        {itens.length === 0 ? (
          <div className="mt-8 rounded-md border border-zinc-200 bg-white p-8 text-center">
            <p className="text-muted">Seu carrinho está vazio.</p>
            <Link href="/produtos" className="mt-4 inline-block">
              <Button variant="primary">Ver catálogo de produtos</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
              {itens.map((item) => (
                <div key={item.produtoId} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{item.nome}</p>
                    <p className="text-xs font-medium text-muted">SKU: {item.sku}</p>
                    <p className="mt-1 text-sm font-medium text-ink">
                      {formatarMoeda(item.preco)}
                    </p>
                  </div>

                  <div>
                    <label htmlFor={`quantidade-${item.produtoId}`} className="sr-only">
                      Quantidade
                    </label>
                    <input
                      id={`quantidade-${item.produtoId}`}
                      type="number"
                      min={1}
                      max={item.estoque}
                      value={item.quantidade}
                      onChange={(evento) =>
                        alterarQuantidade(item.produtoId, Number(evento.target.value))
                      }
                      className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-center text-sm text-ink outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                    />
                  </div>

                  <p className="w-28 text-right text-sm font-medium text-ink">
                    {formatarMoeda(item.preco * item.quantidade)}
                  </p>

                  <button
                    type="button"
                    onClick={() => removerItem(item.produtoId)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-md border border-zinc-200 bg-white p-4">
              <p className="font-medium text-ink">Subtotal</p>
              <p className="text-lg font-medium text-ink">{formatarMoeda(subtotal)}</p>
            </div>

            <div className="mt-6 flex justify-end">
              <Link href="/checkout">
                <Button variant="primary">Finalizar compra</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
