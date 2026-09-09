"use client";

import {
  CheckSquare,
  Equals,
  Plus,
  ShoppingCartSimple,
  Square,
} from "@phosphor-icons/react";

import { useMemo, useState } from "react";
import { useCarrinho } from "@/lib/carrinho/contexto";
import type { Produto } from "@/types/database";

type Props = {
  currentProduct: Produto;
  secondProduct: Produto;
};

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function paraItemCarrinho(produto: Produto) {
  return {
    produtoId: produto.id,
    sku: produto.sku,
    nome: produto.nome,
    preco: produto.preco,
    estoque: produto.estoque,
    pesoKg: produto.peso_kg,
    alturaCm: produto.altura_cm,
    larguraCm: produto.largura_cm,
    comprimentoCm: produto.comprimento_cm,
    imagemUrl: produto.imagem_url,
  };
}

export default function BuyTogether({ currentProduct, secondProduct }: Props) {
  const { adicionarItem } = useCarrinho();

  const [firstSelected, setFirstSelected] = useState(true);
  const [secondSelected, setSecondSelected] = useState(true);

  const selectedCount =
    Number(firstSelected) + Number(secondSelected);

  const total = useMemo(() => {
    let value = 0;

    if (firstSelected) {
      value += currentProduct.preco;
    }

    if (secondSelected) {
      value += secondProduct.preco;
    }

    return value;
  }, [
    firstSelected,
    secondSelected,
    currentProduct.preco,
    secondProduct.preco,
  ]);

  function handleBuyTogether() {
    if (firstSelected) {
      adicionarItem(paraItemCarrinho(currentProduct));
    }

    if (secondSelected) {
      adicionarItem(paraItemCarrinho(secondProduct));
    }
  }

  return (
    <section className="mt-12">
      {/* TÍTULO */}
      <div className="mb-5">
        <h2
          className="
            font-display
            text-[27px]
            font-semibold
            leading-none
            text-ink-900
          "
        >
          Compre Junto
        </h2>
      </div>

      {/* DESKTOP */}
      <div
        className="
          hidden
          items-stretch
          gap-4
          lg:grid
          lg:grid-cols-[minmax(0,08fr)_35px_minmax(0,08fr)_35px_240px]
        "
      >
        {/* PRODUTO 1 */}
        <TogetherProduct
          product={currentProduct}
          selected={firstSelected}
          onToggle={() =>
            setFirstSelected((value) => !value)
          }
        />

        {/* + */}
        <Operator>
          <Plus size={20} weight="bold" />
        </Operator>

        {/* PRODUTO 2 */}
        <TogetherProduct
          product={secondProduct}
          selected={secondSelected}
          onToggle={() =>
            setSecondSelected((value) => !value)
          }
        />

        {/* = */}
        <Operator>
          <Equals size={20} weight="bold" />
        </Operator>

        {/* TOTAL */}
        <div
          className="
            flex
            min-h-[155px]
            flex-col
            items-center
            justify-center
            rounded-fhezo
            border
            border-ink-200
            bg-white
            px-6
            text-center
          "
        >
          <p
            className="
              text-[14px]
              font-semibold
              text-ink-700
            "
          >
            Total da compra
          </p>

          <strong
            className="
              mt-3
              font-display
              text-[28px]
              font-semibold
              leading-none
              text-fhezo-700
            "
          >
            {formatarMoeda(total)}
          </strong>

          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={handleBuyTogether}
            className="
              mt-5
              flex h-[50px]
              w-full
              rounded-fhezo
              items-center
              justify-center
              gap-2
              bg-fhezo-700
              px-4
              font-display
              text-[14px]
              font-semibold
              uppercase
              tracking-[.015em]
              text-white
              transition-colors
              hover:bg-fhezo-800
              disabled:cursor-not-allowed
              disabled:bg-ink-300
            "
          >
            <ShoppingCartSimple
              size={19}
              weight="bold"
            />

            Comprar junto
          </button>
        </div>
      </div>

      {/* TABLET / MOBILE */}
      <div className="space-y-3 lg:hidden">
        <TogetherProduct
          product={currentProduct}
          selected={firstSelected}
          onToggle={() =>
            setFirstSelected((value) => !value)
          }
        />

        <div
          className="
            flex
            h-9
            items-center
            justify-center
          "
        >
          <div
            className="
              flex h-8 w-8
              items-center
              justify-center
              rounded-full
              bg-fhezo-700
              text-white
            "
          >
            <Plus size={17} weight="bold" />
          </div>
        </div>

        <TogetherProduct
          product={secondProduct}
          selected={secondSelected}
          onToggle={() =>
            setSecondSelected((value) => !value)
          }
        />

        <div
          className="
            flex
            h-9
            items-center
            justify-center
          "
        >
          <div
            className="
              flex h-8 w-8
              items-center
              justify-center
              rounded-full
              bg-ink-800
              text-white
            "
          >
            <Equals size={17} weight="bold" />
          </div>
        </div>

        <div
          className="
            border
            border-ink-200
            bg-white
            rounded-fhezo
            p-5
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-5
            "
          >
            <span
              className="
                text-sm
                font-semibold
                text-ink-700
              "
            >
              Total da compra
            </span>

            <strong
              className="
                font-display
                text-[25px]
                font-semibold
                text-fhezo-700
              "
            >
              {formatarMoeda(total)}
            </strong>
          </div>

          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={handleBuyTogether}
            className="
              mt-4
              flex h-12
              w-full
              rounded-fhezo
              items-center
              justify-center
              gap-2
              bg-fhezo-700
              font-display
              text-sm
              font-semibold
              uppercase
              text-white
              transition-colors
              hover:bg-fhezo-800
              disabled:bg-ink-300
            "
          >
            <ShoppingCartSimple
              size={19}
              weight="bold"
            />

            Comprar junto
          </button>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================
   PRODUTO DO COMPRE JUNTO
   ========================================================== */

type TogetherProductProps = {
  product: Produto;
  selected: boolean;
  onToggle: () => void;
};

function TogetherProduct({
  product,
  selected,
  onToggle,
}: TogetherProductProps) {
  return (
    <article
      className="
        relative
        flex
        min-h-[172px]
        items-center
        gap-5
        rounded-fhezo
        border
        border-ink-200
        bg-white
        px-5
        py-5
      "
    >
      {/* CHECK */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={
          selected
            ? `Remover ${product.nome} da combinação`
            : `Adicionar ${product.nome} à combinação`
        }
        className="
          shrink-0
          text-fhezo-700
          transition-colors
          hover:text-fhezo-900
        "
      >
        {selected ? (
          <CheckSquare
            size={20}
            weight="fill"
          />
        ) : (
          <Square size={20} />
        )}
      </button>

      {/* IMAGEM */}
      <a
        href={`/produtos/${product.id}`}
        className="
          flex h-[105px]
          w-[105px]
          shrink-0
          items-center
          justify-center
        "
      >
        {product.imagem_url ? (
          <img
            src={product.imagem_url}
            alt={product.nome}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-sm text-ink-400">Sem imagem</span>
        )}
      </a>

      {/* CONTEÚDO */}
      <div className="min-w-0 flex-1">
        <a
          href={`/produtos/${product.id}`}
          className="
            block
            max-w-[390px]
            text-[15px]
            leading-[1.3]
            text-ink-800
            transition-colors
            hover:text-fhezo-700
          "
        >
          {product.nome}
        </a>

        {product.preco_de && (
          <span
            className="
              mt-2
              block
              text-[13px]
              text-ink-400
              line-through
            "
          >
            {formatarMoeda(product.preco_de)}
          </span>
        )}

        <strong
          className="
            mt-1
            block
            font-display
            text-[22px]
            font-semibold
            leading-none
            text-fhezo-700
          "
        >
            {formatarMoeda(product.preco)}
        </strong>
      </div>
    </article>
  );
}

/* ==========================================================
   OPERADORES + / =
   ========================================================== */

function Operator({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-center
      "
    >
      <span
        className="
          flex h-10 w-10
          items-center
          justify-center
          rounded-full
          bg-fhezo-700
          text-white
        "
      >
        {children}
      </span>
    </div>
  );
}