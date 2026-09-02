"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { buscarResumoPedido, type ResumoPedidoConfirmacao } from "./actions";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const TEXTO_STATUS: Record<string, string> = {
  pendente: "Aguardando confirmação de pagamento",
  pago: "Pagamento confirmado",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const TEXTO_FORMA_PAGAMENTO: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão",
};

export default function PaginaConfirmacao() {
  return (
    <Suspense fallback={<div className="bg-page min-h-screen" />}>
      <ConteudoConfirmacao />
    </Suspense>
  );
}

function ConteudoConfirmacao() {
  const searchParams = useSearchParams();
  const pedidoId = searchParams.get("pedido");

  const [resumo, setResumo] = useState<ResumoPedidoConfirmacao | null>(null);
  const [carregando, setCarregando] = useState(Boolean(pedidoId));

  useEffect(() => {
    if (!pedidoId) return;
    buscarResumoPedido(pedidoId).then((resultado) => {
      setResumo(resultado);
      setCarregando(false);
    });
  }, [pedidoId]);

  if (!pedidoId || (!carregando && !resumo)) {
    return (
      <div className="bg-page">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <p className="text-muted">Pedido não encontrado.</p>
          <Link href="/produtos" className="mt-4 inline-block">
            <Button variant="primary">Ver catálogo de produtos</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (carregando || !resumo) {
    return (
      <div className="bg-page">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center text-muted">Carregando pedido...</div>
      </div>
    );
  }

  if (!resumo.sucesso) {
    return (
      <div className="bg-page">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <p className="text-muted">{resumo.mensagem}</p>
          <Link href="/produtos" className="mt-4 inline-block">
            <Button variant="primary">Ver catálogo de produtos</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-md border border-brand-green/30 bg-brand-green/10 p-6 text-center">
          <h1 className="text-2xl font-semibold text-brand-green-dark">Pedido realizado!</h1>
          <p className="mt-1 text-sm text-ink">Número do pedido: #{resumo.numeroPedido}</p>
        </div>

        <div className="mt-6 rounded-md border border-zinc-200 bg-white p-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Status</span>
            <span className="font-medium text-ink">
              {TEXTO_STATUS[resumo.status] ?? resumo.status}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted">Forma de pagamento</span>
            <span className="font-medium text-ink">
              {resumo.formaPagamento ? TEXTO_FORMA_PAGAMENTO[resumo.formaPagamento] : "—"}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted">Frete</span>
            <span className="font-medium text-ink">{resumo.freteTransportadora ?? "—"}</span>
          </div>
          <div className="mt-4 flex justify-between border-t border-zinc-200 pt-4">
            <span className="font-semibold text-ink">Total</span>
            <span className="text-lg font-semibold text-ink">{formatarMoeda(resumo.total)}</span>
          </div>

          {resumo.boleto && (
            <div className="mt-6 border-t border-zinc-200 pt-4">
              <p className="text-sm font-medium text-ink">Boleto</p>
              {resumo.boleto.linhaDigitavel && (
                <p className="mt-2 break-all rounded-md bg-zinc-50 px-3 py-2 text-xs text-muted">
                  {resumo.boleto.linhaDigitavel}
                </p>
              )}
              <a href={resumo.boleto.url} target="_blank" rel="noopener noreferrer" className="mt-3 block">
                <Button type="button" variant="primary" className="w-full">
                  Abrir boleto
                </Button>
              </a>
            </div>
          )}
        </div>

        <Link href="/produtos" className="mt-6 block text-center">
          <Button variant="outline">Continuar comprando</Button>
        </Link>
      </div>
    </div>
  );
}
