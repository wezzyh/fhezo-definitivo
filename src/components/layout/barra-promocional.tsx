"use client";

import { useEffect, useState } from "react";

// Barra promocional com mensagem rotativa — copiada literalmente de
// referencia-novo-frontend/src/components/layout/Header.tsx (bloco
// "PROMO BAR" + estado/efeito de rotação). Textos mantidos exatamente como
// na referência (decisão do usuário: sem dados reais de marketing
// cadastrados ainda, usar o conteúdo da referência).
const promotions = [
  "Compre R$1.000 em compras e garanta frete grátis.",
  "Até 6x sem juros no cartão.",
  "Entrega no dia para Curitiba e região.",
  "Melhores preços no atacado.",
];

export function BarraPromocional() {
  const [promotionIndex, setPromotionIndex] = useState(0);
  const [promotionPhase, setPromotionPhase] = useState<"enter" | "exit">("enter");

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPromotionPhase("exit");

      window.setTimeout(() => {
        setPromotionIndex((index) => (index + 1) % promotions.length);
        setPromotionPhase("enter");
      }, 220);
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  return (
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
        <span key={promotionIndex} className={`promo-message promo-message-${promotionPhase}`} aria-live="polite">
          {promotions[promotionIndex]}
        </span>
      </div>
    </div>
  );
}
