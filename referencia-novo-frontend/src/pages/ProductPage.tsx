import {
  CaretRight,
  Cube,
  Heart,
  Minus,
  Plus,
  ShoppingCartSimple,
  Truck,
} from "@phosphor-icons/react";

import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { products } from "../data/products";
import { useShop } from "../context/ShopContext";
import { formatCurrency } from "../lib/format";

import ProductGallery from "../components/product/ProductGallery";
import RatingStars from "../components/ui/RatingStars";
import BuyTogether from "../components/product/BuyTogether";
import ProductCard from "../components/product/ProductCard";

export default function ProductPage() {
  const { slug } = useParams();
  const { addToCart } = useShop();

  const [quantity, setQuantity] = useState(1);
  const [cep, setCep] = useState("81820270");

  const product =
    products.find((item) => item.slug === slug) ??
    products[0];

  const discount = product.oldPrice
    ? Math.round(
        ((product.oldPrice - product.price) /
          product.oldPrice) *
          100
      )
    : 0;

  return (
    <main className="pb-16">
      <div className="fhezo-container">
        {/* BREADCRUMB */}

        <nav
          className="
            flex h-[60px]
            items-center
            gap-2
            overflow-hidden
            whitespace-nowrap
            text-[13px]
            text-ink-500
          "
        >
          <Link
            to="/"
            className="hover:text-fhezo-700"
          >
            Início
          </Link>

          <CaretRight size={12} />

          <span>Material elétrico</span>

          <CaretRight size={12} />

          <span>Fita</span>

          <CaretRight size={12} />

          <strong className="truncate text-ink-700">
            {product.name}
          </strong>
        </nav>

        {/* PRODUCT MAIN */}

        <section
          className="
            grid gap-10
            rounded-fhezo
            bg-white
            p-5
            lg:grid-cols-[minmax(0,1.2fr)_minmax(420px,.8fr)]
            lg:p-8
          "
        >
          <ProductGallery
            images={product.gallery}
            productName={product.name}
          />

          <div>
            <div
              className="
                flex
                items-start
                justify-between
                gap-5
              "
            >
              <div>
                <h1
                  className="
                    font-display
                    text-[27px]
                    font-semibold
                    leading-[1.08]
                    text-ink-900
                  "
                >
                  {product.name}
                </h1>

                <div
                  className="
                    mt-3
                    flex flex-wrap
                    gap-x-8 gap-y-1
                    text-sm text-ink-500
                  "
                >
                  <span>
                    Código:{" "}
                    <strong className="text-ink-700">
                      {product.sku}
                    </strong>
                  </span>

                  <span>
                    Marca:{" "}
                    <strong className="text-ink-800">
                      {product.brand}
                    </strong>
                  </span>
                </div>
              </div>

              <button
                className="
                  shrink-0
                  text-fhezo-600
                  transition
                  hover:text-fhezo-800
                "
              >
                <Heart size={30} />
              </button>
            </div>

            <div
              className="
                mt-5
                flex flex-wrap
                items-center
                gap-3
              "
            >
              <RatingStars
                rating={product.rating}
                reviews={product.reviews}
              />

              <a
                href="#avaliacoes"
                className="
                  text-sm
                  font-semibold
                  text-ink-700
                  underline
                "
              >
                ver avaliações
              </a>
            </div>

            <div className="mt-5">
              <span
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-fhezo
                  border border-fhezo-500
                  px-2 py-1
                  text-[12px]
                  font-semibold
                  text-fhezo-700
                "
              >
                <Cube size={14} />

                Em estoque
              </span>
            </div>

            <div className="mt-6">
              {product.oldPrice && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-ink-500">
                    de{" "}
                    <span className="line-through">
                      {formatCurrency(product.oldPrice)}
                    </span>
                  </span>

                  <span
                    className="
                      bg-warning
                      rounded-fhezo
                      px-2 py-1
                      font-display
                      text-sm
                      font-bold
                      text-ink-950
                    "
                  >
                    -{discount}% OFF
                  </span>
                </div>
              )}

              <div
                className="
                  mt-2
                  flex flex-wrap
                  items-end
                  gap-x-5 gap-y-2
                "
              >
                <strong
                  className="
                    font-display
                    text-[42px]
                    font-semibold
                    leading-none
                    text-fhezo-600
                  "
                >
                  {formatCurrency(product.price)}
                </strong>

                <a
                  href="#pagamentos"
                  className="
                    pb-1
                    text-sm
                    font-semibold
                    text-ink-700
                    underline
                  "
                >
                  Ver formas de pagamento
                </a>
              </div>

              <p
                className="
                  mt-3
                  font-semibold
                  text-fhezo-700
                "
              >
                à vista no PIX por{" "}
                {formatCurrency(product.pixPrice)}
              </p>

              <p className="mt-1 text-sm text-ink-600">
                ou {product.installmentText}
              </p>
            </div>

            <div
              className="
                mt-7
                grid gap-4
                sm:grid-cols-[190px_minmax(0,1fr)]
              "
            >
              <div
                className="
                  flex h-[54px]
                  items-center
                  rounded-fhezo
                  border border-ink-300
                  bg-white
                "
              >
                <button
                  onClick={() =>
                    setQuantity((value) =>
                      Math.max(1, value - 1)
                    )
                  }
                  className="
                    flex h-full w-14
                    items-center justify-center
                    text-fhezo-600
                  "
                >
                  <Minus size={19} />
                </button>

                <span
                  className="
                    flex-1
                    text-center
                    font-display
                    text-lg
                    font-semibold
                  "
                >
                  {quantity}
                </span>

                <button
                  onClick={() =>
                    setQuantity((value) => value + 1)
                  }
                  className="
                    flex h-full w-14
                    items-center justify-center
                    text-fhezo-600
                  "
                >
                  <Plus size={19} />
                </button>
              </div>

              <button
                onClick={() =>
                  addToCart(product, quantity)
                }
                className="
                  flex h-[54px]
                  rounded-fhezo
                  items-center justify-center
                  gap-3
                  bg-fhezo-600
                  px-5
                  font-display
                  text-[16px]
                  font-semibold
                  text-white
                  transition
                  hover:bg-fhezo-700
                "
              >
                <ShoppingCartSimple
                  size={22}
                  weight="bold"
                />

                Adicionar ao Carrinho
              </button>
            </div>

            {/* FRETE */}

            <div className="mt-8">
              <label
                className="
                  mb-2 block
                  font-semibold
                  text-ink-900
                "
              >
                Calcule o frete:
              </label>

              <div
                className="
                  flex
                  rounded-fhezo
                  border border-ink-300
                  bg-white
                "
              >
                <input
                  value={cep}
                  onChange={(event) =>
                    setCep(event.target.value)
                  }
                  className="
                    h-[52px]
                    min-w-0 flex-1
                    px-4
                    outline-none
                  "
                />

                <button
                  className="
                    m-1
                    rounded-fhezo
                    min-w-[120px]
                    bg-ink-800
                    px-5
                    font-display
                    font-semibold
                    text-white
                    transition
                    hover:bg-ink-950
                  "
                >
                  Calcular
                </button>
              </div>

              <button
                className="
                  mt-2
                  text-xs
                  font-semibold
                  text-fhezo-700
                  underline
                "
              >
                Não sei meu CEP
              </button>

              <div
                className="
                  mt-4
                  grid
                  grid-cols-[auto_1fr_auto]
                  items-center
                  gap-4
                  rounded-fhezo
                  border border-fhezo-100
                  bg-fhezo-50
                  px-4 py-4
                "
              >
                <Truck
                  size={23}
                  className="text-fhezo-600"
                />

                <div>
                  <strong className="block text-sm">
                    Entrega Fhezo
                  </strong>

                  <span className="text-xs text-ink-500">
                    Em até 4 dias úteis
                  </span>
                </div>

                <strong>
                  {formatCurrency(45.33)}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <BuyTogether currentProduct={product} />

        {/* TECHNICAL */}

        <section className="mt-12 bg-white">
          <div
            className="
              border-b border-ink-200
              px-6 py-5
            "
          >
            <h2
              className="
                font-display
                text-[25px]
                font-semibold
                text-ink-900
              "
            >
              Informações técnicas
            </h2>
          </div>

          <div
            className="
              grid gap-x-12
              px-6 py-6
              lg:grid-cols-2
            "
          >
            {product.technical?.map((item) => (
              <div
                key={item.label}
                className="
                  grid
                  grid-cols-[160px_minmax(0,1fr)]
                  border-b border-ink-200
                  py-3
                  text-sm
                "
              >
                <span className="font-semibold text-ink-600">
                  {item.label}
                </span>

                <span className="text-ink-900">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* SIMILAR */}

        <section className="mt-12">
          <h2
            className="
              font-display
              text-[28px]
              font-semibold
              text-ink-900
            "
          >
            Produtos similares
          </h2>

          <div
            className="
              mt-6
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
              lg:grid-cols-4
              xl:grid-cols-5
            "
          >
            {products
              .filter(
                (item) => item.id !== product.id
              )
              .slice(0, 5)
              .map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                />
              ))}
          </div>
        </section>
      </div>
    </main>
  );
}