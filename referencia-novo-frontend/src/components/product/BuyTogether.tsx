import {
  CheckSquare,
  Equals,
  Plus,
  ShoppingCartSimple,
  Square,
} from "@phosphor-icons/react";

import { useMemo, useState } from "react";

import { Product } from "../../types/product";
import { formatCurrency } from "../../lib/format";
import { products } from "../../data/products";
import { useShop } from "../../context/ShopContext";

type Props = {
  currentProduct: Product;
};

export default function BuyTogether({
  currentProduct,
}: Props) {
  const { addToCart } = useShop();

  const secondProduct =
    products.find(
      (product) => product.id !== currentProduct.id
    ) ?? products[0];

  const [firstSelected, setFirstSelected] = useState(true);
  const [secondSelected, setSecondSelected] = useState(true);

  const selectedCount =
    Number(firstSelected) + Number(secondSelected);

  const total = useMemo(() => {
    let value = 0;

    if (firstSelected) {
      value += currentProduct.price;
    }

    if (secondSelected) {
      value += secondProduct.price;
    }

    return value;
  }, [
    firstSelected,
    secondSelected,
    currentProduct.price,
    secondProduct.price,
  ]);

  function handleBuyTogether() {
    if (firstSelected) {
      addToCart(currentProduct);
    }

    if (secondSelected) {
      addToCart(secondProduct);
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
          lg:grid-cols-[minmax(0,1fr)_42px_minmax(0,1fr)_42px_260px]
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
            min-h-[172px]
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
            {formatCurrency(total)}
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
              {formatCurrency(total)}
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
  product: Product;
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
            ? `Remover ${product.name} da combinação`
            : `Adicionar ${product.name} à combinação`
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
        href={`/produto/${product.slug}`}
        className="
          flex h-[105px]
          w-[105px]
          shrink-0
          items-center
          justify-center
        "
      >
        <img
          src={product.image}
          alt={product.name}
          className="
            h-full
            w-full
            object-contain
          "
        />
      </a>

      {/* CONTEÚDO */}
      <div className="min-w-0 flex-1">
        <a
          href={`/produto/${product.slug}`}
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
          {product.name}
        </a>

        {product.oldPrice && (
          <span
            className="
              mt-2
              block
              text-[13px]
              text-ink-400
              line-through
            "
          >
            {formatCurrency(product.oldPrice)}
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
          {formatCurrency(product.price)}
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