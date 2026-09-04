import {
  Minus,
  Plus,
  Trash,
  Truck,
  X,
} from "@phosphor-icons/react";

import { useShop } from "../../context/ShopContext";
import { formatCurrency } from "../../lib/format";

export default function CartDrawer() {
  const {
    cart,
    cartOpen,
    setCartOpen,
    removeFromCart,
    updateQuantity,
    subtotal,
  } = useShop();

  if (!cartOpen) return null;

  const freeShippingTarget = 1000;

  const missingFreeShipping = Math.max(
    0,
    freeShippingTarget - subtotal
  );

  const shippingProgress = Math.min(
    100,
    (subtotal / freeShippingTarget) * 100
  );

  return (
    <>
      <button
        aria-label="Fechar carrinho"
        onClick={() => setCartOpen(false)}
        className="
          fixed inset-0
          z-[90]
          bg-black/45
        "
      />

      <aside
        className="
          fixed bottom-0 right-0 top-0
          z-[100]
          flex w-full
          max-w-[470px]
          flex-col
          bg-white
          shadow-drawer
        "
      >
        <header
          className="
            flex h-[60px]
            shrink-0
            items-center justify-between
            border-b border-ink-200
            px-5
          "
        >
          <h2
            className="
              font-display
              text-[21px]
              font-semibold
              uppercase
              tracking-[.03em]
              text-ink-900
            "
          >
            Carrinho
          </h2>

          <button
            onClick={() => setCartOpen(false)}
            className="
              flex h-10 w-10
              items-center justify-center
              hover:bg-warm-100
            "
          >
            <X size={24} weight="bold" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {cart.length === 0 ? (
            <div
              className="
                flex min-h-[300px]
                items-center justify-center
                text-center
              "
            >
              <div>
                <p
                  className="
                    font-display
                    text-xl
                    font-semibold
                    text-ink-800
                  "
                >
                  Seu carrinho está vazio
                </p>

                <p className="mt-2 text-sm text-ink-500">
                  Adicione produtos para iniciar seu pedido.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {cart.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="
                    grid
                    grid-cols-[82px_minmax(0,1fr)]
                    gap-4
                    border-b border-ink-200
                    pb-6
                  "
                >
                  <img
                    src={product.image}
                    alt=""
                    className="
                      h-[82px] w-[82px]
                      object-contain
                    "
                  />

                  <div>
                    <div className="flex items-start gap-3">
                      <p
                        className="
                          flex-1
                          text-sm
                          font-medium
                          leading-snug
                          text-ink-900
                        "
                      >
                        {product.name}
                      </p>

                      <button
                        onClick={() =>
                          removeFromCart(product.id)
                        }
                        className="
                          text-ink-400
                          hover:text-danger
                        "
                      >
                        <Trash size={18} />
                      </button>
                    </div>

                    <div
                      className="
                        mt-4
                        flex items-center
                        justify-between
                        gap-3
                      "
                    >
                      <div
                        className="
                          flex h-10
                          items-center
                          border border-ink-300
                        "
                      >
                        <button
                          onClick={() =>
                            updateQuantity(
                              product.id,
                              quantity - 1
                            )
                          }
                          className="
                            flex h-full w-10
                            items-center justify-center
                            text-fhezo-600
                          "
                        >
                          <Minus size={15} />
                        </button>

                        <span
                          className="
                            flex h-full min-w-[38px]
                            items-center justify-center
                            font-semibold
                          "
                        >
                          {quantity}
                        </span>

                        <button
                          onClick={() =>
                            updateQuantity(
                              product.id,
                              quantity + 1
                            )
                          }
                          className="
                            flex h-full w-10
                            items-center justify-center
                            text-fhezo-600
                          "
                        >
                          <Plus size={15} />
                        </button>
                      </div>

                      <strong
                        className="
                          font-display
                          text-xl
                          text-fhezo-600
                        "
                      >
                        {formatCurrency(
                          product.price * quantity
                        )}
                      </strong>
                    </div>

                    <p
                      className="
                        mt-2 text-xs
                        font-semibold
                        text-ink-700
                      "
                    >
                      NCM: 39191020
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <footer className="shrink-0 border-t border-ink-200">
            <div className="bg-warm-100 px-5 py-5">
              <div className="flex items-center gap-2">
                <Truck
                  size={23}
                  weight="fill"
                  className="text-fhezo-600"
                />

                <strong>Sul e Sudeste</strong>
              </div>

              <div
                className="
                  mt-3 h-2
                  overflow-hidden
                  rounded-full
                  bg-ink-200
                "
              >
                <div
                  style={{
                    width: `${shippingProgress}%`,
                  }}
                  className="
                    h-full
                    bg-fhezo-500
                    transition-all
                  "
                />
              </div>

              <p className="mt-2 text-center text-sm">
                {missingFreeShipping > 0 ? (
                  <>
                    Faltam{" "}
                    <strong>
                      {formatCurrency(missingFreeShipping)}
                    </strong>{" "}
                    para o Frete Grátis
                  </>
                ) : (
                  <strong className="text-fhezo-700">
                    Você ganhou frete grátis!
                  </strong>
                )}
              </p>
            </div>

            <div className="px-5 py-5">
              <div
                className="
                  flex items-center justify-between
                  text-sm text-ink-600
                "
              >
                <span>Subtotal</span>

                <span>{formatCurrency(subtotal)}</span>
              </div>

              <div
                className="
                  mt-4 flex
                  items-center justify-between
                  border-t border-ink-200
                  pt-4
                "
              >
                <strong
                  className="
                    font-display
                    text-xl
                    text-ink-900
                  "
                >
                  Total
                </strong>

                <strong
                  className="
                    font-display
                    text-[25px]
                    text-fhezo-600
                  "
                >
                  {formatCurrency(subtotal)}
                </strong>
              </div>

              <button
                className="
                  mt-5 h-[52px] w-full
                  bg-fhezo-600
                  font-display
                  font-semibold
                  uppercase
                  text-white
                  transition
                  hover:bg-fhezo-700
                "
              >
                Finalizar compra
              </button>

              <button
                onClick={() => setCartOpen(false)}
                className="
                  mt-3 w-full
                  py-2
                  text-sm
                  font-bold
                  uppercase
                  text-ink-800
                  underline
                "
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