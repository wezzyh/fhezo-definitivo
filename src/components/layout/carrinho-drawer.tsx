"use client";

import { useState } from "react";
import Link from "next/link";
import { Cube, Minus, Plus, Trash, X } from "@phosphor-icons/react";
import { useCarrinho } from "@/lib/carrinho/contexto";
import type { ItemCarrinho } from "@/lib/carrinho/reducer";
import { calcularOpcoesFrete, type OpcaoFrete } from "@/lib/frete/melhorenvio";

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

function formatarCep(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

// Calculadora de frete do drawer — reaproveita a mesma Server Action do
// checkout (calcularOpcoesFrete, src/lib/frete/melhorenvio.ts) em vez de
// duplicar a chamada à API do Melhor Envio. Diferente do checkout
// (SecaoFrete, que calcula sozinho assim que o CEP completa e guarda a
// opção escolhida no CheckoutContext pra seguir pro pagamento), aqui é só
// uma estimativa sob demanda (botão "Calcular") pra ajudar a decidir antes
// de ir pro checkout — nada aqui é persistido ou herdado pelo checkout, que
// continua pedindo o CEP de novo e mantém sua própria seleção.
function CalculadoraFrete({ itens }: { itens: ItemCarrinho[] }) {
  const [cep, setCep] = useState("");
  const [opcoes, setOpcoes] = useState<OpcaoFrete[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function calcular() {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) {
      setErro("Informe um CEP válido.");
      setOpcoes(null);
      return;
    }

    setCarregando(true);
    setErro(null);
    setOpcoes(null);

    const resultado = await calcularOpcoesFrete(
      cepLimpo,
      itens.map((item) => ({
        id: item.produtoId,
        larguraCm: item.larguraCm,
        alturaCm: item.alturaCm,
        comprimentoCm: item.comprimentoCm,
        pesoKg: item.pesoKg,
        valorUnitario: item.preco,
        quantidade: item.quantidade,
      })),
    );

    setCarregando(false);

    if (!resultado.sucesso) {
      setErro(resultado.mensagem);
      return;
    }
    setOpcoes(resultado.opcoes);
  }

  return (
    <div className="border-b border-ink-200 px-5 py-4">
      <p className="text-sm font-semibold text-ink-800">Calcular frete</p>

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          placeholder="00000-000"
          value={cep}
          onChange={(evento) => setCep(formatarCep(evento.target.value))}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              evento.preventDefault();
              void calcular();
            }
          }}
          maxLength={9}
          aria-label="CEP de entrega"
          className="h-11 min-w-0 flex-1 rounded-fhezo border border-ink-300 px-3 text-sm text-ink-900 outline-none transition focus:border-fhezo-500"
        />

        <button
          type="button"
          onClick={() => void calcular()}
          disabled={carregando}
          className="h-11 shrink-0 rounded-fhezo bg-ink-800 px-4 text-sm font-semibold text-white transition hover:bg-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {carregando ? "Calculando..." : "Calcular"}
        </button>
      </div>

      {erro && <p className="mt-2 text-xs text-fhezo-danger">{erro}</p>}

      {opcoes && (
        <ul className="mt-3 space-y-2">
          {opcoes.map((opcao) => (
            <li
              key={opcao.id}
              className="flex items-center justify-between gap-3 rounded-fhezo border border-ink-200 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">
                  {opcao.transportadora ? `${opcao.transportadora} — ${opcao.nome}` : opcao.nome}
                </p>
                <p className="text-xs text-ink-500">Prazo: {opcao.prazoDias} dia(s) útil(eis)</p>
              </div>
              <strong className="shrink-0 text-fhezo-600">{formatarMoeda(opcao.valor)}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
            className="flex h-10 w-10 items-center justify-center rounded-fhezo hover:bg-warm-100"
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
                  <div className="flex h-[82px] w-[82px] shrink-0 items-center justify-center overflow-hidden rounded-fhezo bg-warm-100">
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
                      <div className="flex h-10 items-center overflow-hidden rounded-fhezo border border-ink-300">
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.produtoId, item.quantidade - 1)}
                          disabled={item.quantidade <= 1}
                          aria-label="Diminuir quantidade"
                          className="flex h-full w-10 items-center justify-center text-fhezo-600 disabled:cursor-not-allowed disabled:text-ink-300"
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

            <CalculadoraFrete itens={itens} />

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
                className="mt-5 flex h-[52px] w-full items-center justify-center rounded-fhezo bg-fhezo-600 font-display font-semibold uppercase text-white transition hover:bg-fhezo-700"
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
