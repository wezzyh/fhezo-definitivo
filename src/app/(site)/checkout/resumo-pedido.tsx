"use client";

import { useCarrinho } from "@/lib/carrinho/contexto";
import { useCheckout } from "@/lib/checkout/contexto";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ResumoPedido() {
  const { itens, subtotal } = useCarrinho();
  const { freteSelecionado } = useCheckout();

  const valorFrete = freteSelecionado?.valor ?? 0;
  const total = subtotal + valorFrete;

  return (
    <aside className="h-fit rounded-md border border-zinc-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-ink">Resumo do pedido</h2>

      <ul className="mt-4 space-y-2">
        {itens.map((item) => (
          <li key={item.produtoId} className="flex justify-between gap-2 text-sm">
            <span className="text-muted">
              {item.quantidade}x {item.nome}
            </span>
            <span className="shrink-0 font-medium text-ink">
              {formatarMoeda(item.preco * item.quantidade)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-1 border-t border-zinc-200 pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Subtotal</span>
          <span className="font-medium text-ink">{formatarMoeda(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Frete</span>
          <span className="font-medium text-ink">
            {freteSelecionado ? formatarMoeda(valorFrete) : "A definir"}
          </span>
        </div>
      </div>

      <div className="mt-4 flex justify-between border-t border-zinc-200 pt-4">
        <span className="font-semibold text-ink">Total</span>
        <span className="text-lg font-semibold text-ink">{formatarMoeda(total)}</span>
      </div>
    </aside>
  );
}
