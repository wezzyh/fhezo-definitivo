"use client";

import Link from "next/link";
import { ShoppingCartSimple, Cube } from "@phosphor-icons/react";
import { useCarrinho } from "@/lib/carrinho/contexto";
import { calcularDesconto, calcularPrecoPix, calcularParcelamento } from "@/lib/produtos/precificacao";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface ProdutoCartao {
  id: string;
  sku: string;
  nome: string;
  preco: number;
  preco_de: number | null;
  imagem_url: string | null;
  estoque: number;
  peso_kg: number;
  altura_cm: number;
  largura_cm: number;
  comprimento_cm: number;
}

export function CartaoProduto({ produto }: { produto: ProdutoCartao }) {
  const { adicionarItem } = useCarrinho();
  const { temDesconto, percentualDesconto } = calcularDesconto(produto.preco, produto.preco_de);
  const parcelamento = calcularParcelamento(produto.preco);
  const semEstoque = produto.estoque <= 0;

  function lidarComAdicionar() {
    adicionarItem(
      {
        produtoId: produto.id,
        sku: produto.sku,
        nome: produto.nome,
        preco: produto.preco,
        estoque: produto.estoque,
        pesoKg: produto.peso_kg,
        alturaCm: produto.altura_cm,
        larguraCm: produto.largura_cm,
        comprimentoCm: produto.comprimento_cm,
      },
      1,
    );
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-fhezo border border-ink-200 bg-white transition duration-200 hover:border-ink-300 hover:shadow-panel">
      <Link href={`/produtos/${produto.id}`} className="relative block">
        {temDesconto && (
          <span className="absolute left-3 top-3 z-10 bg-fhezo-warning px-3 py-1.5 font-display text-[15px] font-bold text-ink-950">
            {percentualDesconto}% OFF
          </span>
        )}

        <div className="flex h-[245px] items-center justify-center bg-white p-6">
          {produto.imagem_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitrária cadastrada pelo admin, sem domínio fixo para next/image.
            <img
              src={produto.imagem_url}
              alt={produto.nome}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <Cube size={64} weight="thin" className="text-ink-200" />
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/produtos/${produto.id}`} className="line-clamp-3 min-h-[64px] text-[16px] leading-[1.34] text-ink-700 transition hover:text-fhezo-700">
          {produto.nome}
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1 text-[12px] font-medium text-fhezo-600">
            <Cube size={15} />
            {semEstoque ? "Sem estoque" : "Em estoque"}
          </span>
        </div>

        <div className="mt-3">
          {temDesconto && produto.preco_de && (
            <p className="text-sm text-ink-500 line-through">de {formatarMoeda(produto.preco_de)}</p>
          )}

          <p className="font-display text-[30px] font-semibold leading-none text-fhezo-600">
            {formatarMoeda(produto.preco)}
          </p>

          <p className="mt-2 text-sm text-fhezo-700">
            à vista no PIX por <strong>{formatarMoeda(calcularPrecoPix(produto.preco))}</strong>
          </p>

          <p className="mt-1 text-[13px] text-ink-500">
            {parcelamento.parcelas > 1
              ? `ou ${parcelamento.parcelas}x de ${formatarMoeda(parcelamento.valorParcela)} sem juros`
              : "à vista"}
          </p>

          <button
            type="button"
            disabled={semEstoque}
            onClick={lidarComAdicionar}
            className="mt-5 flex h-[50px] w-full items-center justify-center gap-2 rounded-fhezo bg-fhezo-600 font-display text-[15px] font-semibold uppercase tracking-[.01em] text-white transition hover:bg-fhezo-700 active:bg-fhezo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fhezo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-ink-300"
          >
            <ShoppingCartSimple size={20} weight="bold" />
            {semEstoque ? "Indisponível" : "Adicionar ao carrinho"}
          </button>
        </div>
      </div>
    </article>
  );
}
