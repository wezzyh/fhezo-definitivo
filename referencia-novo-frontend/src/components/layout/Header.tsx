import DepartmentsMegaMenu from "../navigation/DepartmentsMegaMenu";

import {
  Basket,
  EnvelopeSimple,
  FacebookLogo,
  InstagramLogo,
  MagnifyingGlass,
  Phone,
  TiktokLogo,
  WhatsappLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";

import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import AccountMenu from "../account/AccountMenu";
import { useShop } from "../../context/ShopContext";

const categories = [
  "Rolamentos",
  "Mancais",
  "Acoplamentos",
  "Correntes",
  "Engrenagens",
  "Ferramentas",
  "Químicos",
  "Movimentação Linear",
  "Vedações",
];

const promotions = [
  "Compre R$1.000 em compras e garanta frete grátis.",
  "Até 6x sem juros no cartão.",
  "Entrega no dia para Curitiba e região.",
  "Melhores preços no atacado.",
];

export default function Header() {
  const { cartCount, setCartOpen } = useShop();
  const [promotionIndex, setPromotionIndex] = useState(0);
  const [promotionPhase, setPromotionPhase] = useState<
    "enter" | "exit"
  >("enter");

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPromotionPhase("exit");

      window.setTimeout(() => {
        setPromotionIndex((index) =>
          (index + 1) % promotions.length
        );
        setPromotionPhase("enter");
      }, 220);
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <header className="relative z-50">
      {/* PROMO BAR */}
      <div className="bg-fhezo-500 text-[#ffffff]">
        <div
          className="
            fhezo-container
            flex h-9
            items-center
            justify-center
            gap-8
            overflow-hidden
            whitespace-nowrap
            font-display
            text-[14px]
            font-bold
            uppercase
            tracking-[.025em]
            lg:text-[13px]
          "
        >
          <span
            key={promotionIndex}
            className={`promo-message promo-message-${promotionPhase}`}
            aria-live="polite"
          >
            {promotions[promotionIndex]}
          </span>
        </div>
      </div>

      {/* DARK HEADER */}
      <div className="bg-[#0d111c] text-white">
        {/* CONTACT BAR */}
        <div>
          <div
            className="
              fhezo-container
              hidden h-10
              items-center
              justify-between
              md:flex
            "
          >
            <div className="flex items-center gap-7 text-[13px]">
              <a
                href="#"
                className="
                  flex items-center gap-2
                  font-semibold
                  hover:text-fhezo-300
                "
              >
                <WhatsappLogo
                  size={18}
                  className="text-fhezo-400"
                />
                WhatsApp
              </a>

              <a
                href="tel:+55419935156006"
                className="
                  flex items-center gap-2
                  font-semibold
                  hover:text-fhezo-300
                "
              >
                <Phone
                  size={18}
                  className="text-fhezo-400"
                />
                (51) 99351-56006
              </a>

              <a
                href="mailto:sac@fhezo.com.br"
                className="
                  flex items-center gap-2
                  font-semibold
                  hover:text-fhezo-300
                "
              >
                <EnvelopeSimple
                  size={18}
                  className="text-fhezo-400"
                />
                sac@fhezo.com.br
              </a>
            </div>

            <div className="flex items-center gap-5 text-ink-200">
              <InstagramLogo size={17} />
              <FacebookLogo size={17} />
              <YoutubeLogo size={18} />
              <TiktokLogo size={17} />
            </div>
          </div>
        </div>

        {/* MAIN HEADER */}
        <div className="bg-[#151821]">
          <div
            className="
              fhezo-container
              flex h-[92px]
              items-center gap-5
              lg:gap-9
            "
          >
            <Link
              to="/"
              className="
                flex w-[170px]
                shrink-0
                items-center
                lg:w-[205px]
              "
            >
              <img
                src="/assets/brand/fhezo-logo.svg"
                alt="Fhezo Industrial"
                className="max-h-[58px] w-full object-contain object-left"
              />
            </Link>

            <div className="group relative min-w-0 flex-1">
              <input
                type="search"
                placeholder="Busque por produto, código, medida ou marca"
                className="
                  h-[54px] w-full
                  rounded-fhezo
                  border-2 border-[#272d3d]
                  bg-[#151821]
                  pl-5 pr-[62px]
                  text-[15px]
                  text-white
                  outline-none
                  transition
                  placeholder:text-ink-300
                  focus:border-fhezo-500
                  focus:bg-[#151821]
                  lg:text-base
                "
              />

              <button
                className="
                  absolute right-[5px] top-[5px]
                  flex h-11 w-11
                  rounded-fhezo
                  items-center justify-center
                  text-ink-300
                  transition
                  group-focus-within:text-fhezo-400
                  hover:text-fhezo-300
                "
                aria-label="Buscar"
              >
                <MagnifyingGlass
                  size={21}
                  weight="bold"
                />
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-5">
              <AccountMenu />

              <button
                onClick={() => setCartOpen(true)}
                className="
                  relative flex h-[48px] w-[48px]
                    rounded-fhezo
                  items-center justify-center
                  bg-white/[.055]
                  text-white
                  transition
                  hover:bg-white/[.1]
                "
                aria-label="Abrir carrinho"
              >
                <Basket size={25} />

                {cartCount > 0 && (
                  <span
                    className="
                      absolute -right-2 -top-2
                      flex h-6 min-w-6
                      items-center justify-center
                      rounded-full
                      bg-fhezo-400
                      px-1
                      text-xs
                      font-bold
                      text-ink-950
                    "
                  >
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* NAV */}
        <nav className="relative">
          <div
            className="
              fhezo-container
              flex h-[50px]
              items-center
            "
          >
            <DepartmentsMegaMenu />

            <div
              className="
                ml-7
                flex min-w-0 flex-1
                items-center gap-7
                overflow-x-auto
                no-scrollbar
              "
            >
              {categories.map((category) => (
                <a
                  key={category}
                  href="#"
                  className="
                    shrink-0
                    font-display
                    text-[13px]
                    font-semibold
                    uppercase
                    tracking-[.01em]
                    text-ink-100
                    transition-colors
                    hover:text-fhezo-400
                  "
                >
                  {category}
                </a>
              ))}
            </div>
          </div>
        </nav>
      </div>

    </header>
  );
}