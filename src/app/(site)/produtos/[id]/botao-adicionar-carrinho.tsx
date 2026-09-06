"use client";

import { useState } from "react";
import { ShoppingCartSimple, Minus, Plus } from "@phosphor-icons/react";
import { useCarrinho } from "@/lib/carrinho/contexto";

interface BotaoAdicionarCarrinhoProps {
  produtoId: string;
  sku: string;
  nome: string;
  preco: number;
  estoque: number;
  pesoKg: number;
  alturaCm: number;
  larguraCm: number;
  comprimentoCm: number;
  imagemUrl: string | null;
}

export function BotaoAdicionarCarrinho(props: BotaoAdicionarCarrinhoProps) {
  const { adicionarItem } = useCarrinho();
  const [quantidade, setQuantidade] = useState(1);
  const [adicionado, setAdicionado] = useState(false);

  if (props.estoque <= 0) {
    return <p className="text-sm font-medium text-ink-500">Produto sem estoque no momento.</p>;
  }

  function lidarComClique() {
    const { produtoId, sku, nome, preco, estoque, pesoKg, alturaCm, larguraCm, comprimentoCm, imagemUrl } =
      props;
    adicionarItem(
      { produtoId, sku, nome, preco, estoque, pesoKg, alturaCm, larguraCm, comprimentoCm, imagemUrl },
      quantidade,
    );
    setAdicionado(true);
    setTimeout(() => setAdicionado(false), 2000);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[190px_minmax(0,1fr)]">
      <div className="flex h-[54px] items-center rounded-fhezo border border-ink-300 bg-white">
        <button
          type="button"
          onClick={() => setQuantidade((valor) => Math.max(1, valor - 1))}
          className="flex h-full w-14 items-center justify-center text-fhezo-600"
          aria-label="Diminuir quantidade"
        >
          <Minus size={19} />
        </button>
        <span className="flex-1 text-center font-display text-lg font-semibold">{quantidade}</span>
        <button
          type="button"
          onClick={() => setQuantidade((valor) => Math.min(valor + 1, props.estoque))}
          className="flex h-full w-14 items-center justify-center text-fhezo-600"
          aria-label="Aumentar quantidade"
        >
          <Plus size={19} />
        </button>
      </div>

      <button
        type="button"
        onClick={lidarComClique}
        className="flex h-[54px] items-center justify-center gap-3 rounded-fhezo bg-fhezo-600 px-5 font-display text-[16px] font-semibold text-white transition hover:bg-fhezo-700"
      >
        <ShoppingCartSimple size={22} weight="bold" />
        {adicionado ? "Adicionado!" : "Adicionar ao Carrinho"}
      </button>
    </div>
  );
}
