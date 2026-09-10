"use client";

import { useEffect, useRef } from "react";
import { Cube, X } from "@phosphor-icons/react";
import { useCarrinho } from "@/lib/carrinho/contexto";

const DURACAO_MS = 6000;

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Toast "produto adicionado ao carrinho" — canto superior direito, dispara
// em qualquer adicionarItem() (ver notificacaoAdicao no CarrinhoProvider),
// não só no botão da página de produto. Some sozinho depois de DURACAO_MS
// ou ao clicar fora dele (sem overlay bloqueando a página — só um listener
// de clique fora, pra não atrapalhar quem clica em outra coisa enquanto o
// toast ainda está visível). "Ver carrinho" abre o drawer (mesma fonte de
// dados do checkout) sem navegar pra nenhuma rota.
export function ToastCarrinho() {
  const { notificacaoAdicao, fecharNotificacaoAdicao, quantidadeTotal, subtotal, abrirCarrinho } = useCarrinho();
  const toastRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!notificacaoAdicao) return;

    const timer = window.setTimeout(fecharNotificacaoAdicao, DURACAO_MS);

    function lidarComCliqueFora(evento: MouseEvent) {
      if (toastRef.current && !toastRef.current.contains(evento.target as Node)) {
        fecharNotificacaoAdicao();
      }
    }
    document.addEventListener("mousedown", lidarComCliqueFora);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", lidarComCliqueFora);
    };
  }, [notificacaoAdicao, fecharNotificacaoAdicao]);

  if (!notificacaoAdicao) return null;

  const { item, quantidadeAdicionada } = notificacaoAdicao;

  return (
    <div
      key={notificacaoAdicao.id}
      ref={toastRef}
      role="status"
      className="
        animate-toast-in
        fixed right-4 top-4 z-[130]
        w-[min(380px,calc(100vw-2rem))]
        rounded-fhezo
        border border-ink-200
        bg-white
        p-4
        shadow-drawer
      "
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-[15px] font-semibold leading-snug text-ink-900">
          Já adicionamos o produto ao carrinho!
        </p>

        <button
          type="button"
          onClick={fecharNotificacaoAdicao}
          aria-label="Fechar notificação"
          className="shrink-0 text-ink-400 transition-colors hover:text-ink-700"
        >
          <X size={18} weight="bold" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-ink-200 pt-3">
        <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-fhezo bg-warm-100">
          {item.imagemUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitrária cadastrada pelo admin, sem domínio fixo para next/image.
            <img src={item.imagemUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            <Cube size={24} weight="thin" className="text-ink-300" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-900">{item.nome}</p>
          <p className="mt-0.5 text-xs text-ink-500">
            {quantidadeAdicionada} {quantidadeAdicionada === 1 ? "unidade" : "unidades"} · {formatarMoeda(item.preco)}{" "}
            cada
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-ink-200 pt-3 text-sm">
        <span className="text-ink-600">
          Total ({quantidadeTotal} {quantidadeTotal === 1 ? "item" : "itens"})
        </span>
        <strong className="font-display text-base text-fhezo-600">{formatarMoeda(subtotal)}</strong>
      </div>

      <button
        type="button"
        onClick={() => {
          fecharNotificacaoAdicao();
          abrirCarrinho();
        }}
        className="mt-3 flex h-11 w-full items-center justify-center rounded-fhezo bg-fhezo-600 font-display text-sm font-semibold uppercase text-white transition hover:bg-fhezo-700"
      >
        Ver carrinho
      </button>
    </div>
  );
}
