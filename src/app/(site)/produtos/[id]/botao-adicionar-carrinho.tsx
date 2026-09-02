"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
}

export function BotaoAdicionarCarrinho(props: BotaoAdicionarCarrinhoProps) {
  const { adicionarItem } = useCarrinho();
  const [quantidade, setQuantidade] = useState(1);
  const [adicionado, setAdicionado] = useState(false);

  if (props.estoque <= 0) {
    return <p className="text-sm font-medium text-muted">Produto sem estoque no momento.</p>;
  }

  function lidarComClique() {
    const { produtoId, sku, nome, preco, estoque, pesoKg, alturaCm, larguraCm, comprimentoCm } =
      props;
    adicionarItem(
      { produtoId, sku, nome, preco, estoque, pesoKg, alturaCm, larguraCm, comprimentoCm },
      quantidade,
    );
    setAdicionado(true);
    setTimeout(() => setAdicionado(false), 2000);
  }

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="quantidade" className="sr-only">
        Quantidade
      </label>
      <input
        id="quantidade"
        type="number"
        min={1}
        max={props.estoque}
        value={quantidade}
        onChange={(evento) =>
          setQuantidade(Math.min(Math.max(1, Number(evento.target.value)), props.estoque))
        }
        className="w-16 rounded-md border border-zinc-300 px-2 py-2 text-center text-sm text-ink outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
      />
      <Button type="button" variant="primary" onClick={lidarComClique}>
        {adicionado ? "Adicionado!" : "Adicionar ao carrinho"}
      </Button>
    </div>
  );
}
