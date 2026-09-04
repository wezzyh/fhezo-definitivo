import {
  Cube,
  ShoppingCartSimple,
} from "@phosphor-icons/react";

import { Link } from "react-router-dom";

import { Product } from "../../types/product";
import { formatCurrency } from "../../lib/format";
import { useShop } from "../../context/ShopContext";
import RatingStars from "../ui/RatingStars";

type Props = {
  product: Product;
};

export default function ProductCard({ product }: Props) {
  const { addToCart } = useShop();

  const discount = product.oldPrice
    ? Math.round(
        ((product.oldPrice - product.price) /
          product.oldPrice) *
          100
      )
    : null;

  return (
    <article
      className="
        group
        flex h-full flex-col
        rounded-fhezo
        overflow-hidden
        border border-ink-200
        bg-white
        transition
        duration-200
        hover:border-ink-300
        hover:shadow-panel
      "
    >
      <Link
        to={`/produto/${product.slug}`}
        className="relative block"
      >
        {discount && (
          <span
            className="
              absolute left-3 top-3 z-10
              bg-warning
              px-3 py-1.5
              font-display
              text-[15px]
              font-bold
              text-ink-950
            "
          >
            {discount}% OFF
          </span>
        )}

        <div
          className="
            flex h-[245px]
            items-center justify-center
            bg-white
            p-6
          "
        >
          <img
            src={product.image}
            alt={product.name}
            className="
              h-full w-full
              object-contain
              transition-transform
              duration-300
              group-hover:scale-[1.02]
            "
          />
        </div>

        <div className="min-h-[34px] py-1">
          {product.badge && (
            <div
              className="
                bg-warning
                py-1
                text-center
                font-display
                text-[15px]
                font-semibold
                text-ink-950
              "
            >
              {product.badge}
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link
          to={`/produto/${product.slug}`}
          className="
            product-title
            min-h-[64px]
            text-[16px]
            leading-[1.34]
            text-ink-700
            transition
            hover:text-fhezo-700
          "
        >
          {product.name}
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <RatingStars
            rating={product.rating}
            compact
          />

          <span
            className="
              flex items-center gap-1
              text-[12px]
              font-medium
              text-fhezo-600
            "
          >
            <Cube size={15} />
            Em estoque
          </span>
        </div>

        <div className="mt-3">
          {product.oldPrice && (
            <p className="text-sm text-ink-500 line-through">
              de {formatCurrency(product.oldPrice)}
            </p>
          )}

          <p
            className="
              font-display
              text-[30px]
              font-semibold
              leading-none
              text-fhezo-600
            "
          >
            {formatCurrency(product.price)}
          </p>

          <p className="mt-2 text-sm text-fhezo-700">
            à vista no PIX por{" "}
            <strong>
              {formatCurrency(product.pixPrice)}
            </strong>
          </p>

          <p className="mt-1 text-[13px] text-ink-500">
            ou {product.installmentText}
          </p>

          <button
            onClick={() => addToCart(product)}
            className="
              mt-5
              flex h-[50px] w-full
              rounded-fhezo
              items-center justify-center
              gap-2
              bg-fhezo-600
              font-display
              text-[15px]
              font-semibold
              uppercase
              tracking-[.01em]
              text-white
              transition
              hover:bg-fhezo-700
              active:bg-fhezo-800
              focus-fhezo
            "
          >
            <ShoppingCartSimple
              size={20}
              weight="bold"
            />

            Adicionar ao carrinho
          </button>
        </div>
      </div>
    </article>
  );
}