"use client";

import Link from "next/link";
import { Cube, Minus, Plus, Trash, X } from "@phosphor-icons/react";
import { useCarrinho } from "@/lib/carrinho/contexto";

// Drawer lateral do carrinho — Etapa 3 da integração do novo frontend
// (ver HANDOFF.md). Baseado visualmente em
// referencia-novo-frontend/src/components/cart/CartDrawer.tsx, mas usando
// o Context real do carrinho (mesma fonte de dados do checkout, sem
// duplicar estado) em vez do ShopContext mockado. Diferenças deliberadas
// em relação ao mock: sem "NCM: 39191020" fixo (não é dado real do item),
// sem a claim fake de região de frete "Sul e Sudeste" (Melhor Envio fica
// fora de escopo aqui) — o limite de frete grátis usado é o mesmo R$ 500
// já anunciado na barra promocional do header.
const LIMITE_FRETE_GRATIS = 500;

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CarrinhoDrawer() {
  const { itens, subtotal, aberto, fecharCarrinho, removerItem, alterarQuantidade } = useCarrinho();

  if (!aberto) return null;

  const faltaParaFreteGratis = Math.max(0, LIMITE_FRETE_GRATIS - subtotal);
  const progressoFrete = Math.min(100, (subtotal / LIMITE_FRETE_GRATIS) * 100);

  return (
    <>
      <button
        type="button"
        aria-label="Fechar carrinho"
        onClick={fecharCarrinho}
        className="fixed inset-0 z-[90] bg-black/45"
      />

      <aside className="fixed bottom-0 right-0 top-0 z-[100] flex w-full max-w-[470px] flex-col bg-white shadow-drawer">
        <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-ink-200 px-5">
          <h2 className="font-display text-[21px] font-semibold uppercase tracking-[.03em] text-ink-900">
            Carrinho
          </h2>

          <button
            type="button"
            onClick={fecharCarrinho}
            aria-label="Fechar carrinho"
            className="flex h-10 w-10 items-center justify-center hover:bg-warm-100"
          >
            <X size={24} weight="bold" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {itens.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center text-center">
              <div>
                <p className="font-display text-xl font-semibold text-ink-800">Seu carrinho está vazio</p>
                <p className="mt-2 text-sm text-ink-500">Adicione produtos para iniciar seu pedido.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {itens.map((item) => (
                <div key={item.produtoId} className="grid grid-cols-[82px_minmax(0,1fr)] gap-4 border-b border-ink-200 pb-6">
                  <div className="flex h-[82px] w-[82px] shrink-0 items-center justify-center bg-warm-100">
                    {item.imagemUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitrária cadastrada pelo admin, sem domínio fixo para next/image.
                      <img src={item.imagemUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <Cube size={32} weight="thin" className="text-ink-300" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <p className="flex-1 text-sm font-medium leading-snug text-ink-900">{item.nome}</p>

                      <button
                        type="button"
                        onClick={() => removerItem(item.produtoId)}
                        aria-label={`Remover ${item.nome} do carrinho`}
                        className="text-ink-400 hover:text-fhezo-danger"
                      >
                        <Trash size={18} />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex h-10 items-center border border-ink-300">
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.produtoId, item.quantidade - 1)}
                          aria-label="Diminuir quantidade"
                          className="flex h-full w-10 items-center justify-center text-fhezo-600"
                        >
                          <Minus size={15} />
                        </button>

                        <span className="flex h-full min-w-[38px] items-center justify-center font-semibold">
                          {item.quantidade}
                        </span>

                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.produtoId, item.quantidade + 1)}
                          disabled={item.quantidade >= item.estoque}
                          aria-label="Aumentar quantidade"
                          className="flex h-full w-10 items-center justify-center text-fhezo-600 disabled:cursor-not-allowed disabled:text-ink-300"
                        >
                          <Plus size={15} />
                        </button>
                      </div>

                      <strong className="font-display text-xl text-fhezo-600">
                        {formatarMoeda(item.preco * item.quantidade)}
                      </strong>
                    </div>

                    <p className="mt-2 text-xs font-semibold text-ink-700">SKU: {item.sku}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {itens.length > 0 && (
          <footer className="shrink-0 border-t border-ink-200">
            <div className="bg-warm-100 px-5 py-5">
              <div className="h-2 overflow-hidden rounded-full bg-ink-200">
                <div
                  style={{ width: `${progressoFrete}%` }}
                  className="h-full bg-fhezo-500 transition-all"
                />
              </div>

              <p className="mt-2 text-center text-sm">
                {faltaParaFreteGratis > 0 ? (
                  <>
                    Faltam <strong>{formatarMoeda(faltaParaFreteGratis)}</strong> para o frete grátis
                  </>
                ) : (
                  <strong className="text-fhezo-700">Você ganhou frete grátis!</strong>
                )}
              </p>
            </div>

            <div className="px-5 py-5">
              <div className="flex items-center justify-between text-sm text-ink-600">
                <span>Subtotal</span>
                <span>{formatarMoeda(subtotal)}</span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-ink-200 pt-4">
                <strong className="font-display text-xl text-ink-900">Total</strong>
                <strong className="font-display text-[25px] text-fhezo-600">{formatarMoeda(subtotal)}</strong>
              </div>

              <Link
                href="/checkout"
                onClick={fecharCarrinho}
                className="mt-5 flex h-[52px] w-full items-center justify-center bg-fhezo-600 font-display font-semibold uppercase text-white transition hover:bg-fhezo-700"
              >
                Finalizar compra
              </Link>

              <button
                type="button"
                onClick={fecharCarrinho}
                className="mt-3 w-full py-2 text-sm font-bold uppercase text-ink-800 underline"
              >
                Continuar comprando
              </button>
            </div>
          </footer>
        )}
      </aside>
    </>
  );
}
