"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Marca } from "@/types/database";

// Cópia do padrão visual de src/components/home/faixa-categorias.tsx
// (carrossel de círculos + nome abaixo, mesmas setas de scroll) — pedido
// explícito do usuário: não alterar/adaptar o componente de categorias,
// só duplicar o padrão pra marcas. Diferença: aqui toda marca tem
// imagem_url (a consulta que alimenta este componente já filtra por
// imagem_url preenchido — sem fallback de letra, já que "Compre por
// marca" não faz sentido com um círculo genérico sem logo).
type FaixaMarcasProps = {
  marcas: Pick<Marca, "id" | "nome" | "imagem_url">[];
};

export function FaixaMarcas({ marcas }: FaixaMarcasProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;

    const maxScrollLeft = el.scrollWidth - el.clientWidth;

    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 6);
  }

  function scrollByAmount(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;

    const amount = 320;

    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    updateScrollState();

    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  return (
    // Sem <section>/.fhezo-container próprios: o único ponto de uso
    // (page.tsx, "Compre por marca") já envolve este componente com
    // <section className="bg-[#f3f3f1]"><div className="fhezo-container">.
    // Ter os dois aqui também deixava os ícones de marca ~20px mais
    // recuados que o título "Compre por marca" acima (dois
    // fhezo-container aninhados, cada um tirando sua própria margem) —
    // mesmo padrão que FaixaCategorias já seguia (sem wrapper próprio,
    // sempre por conta de quem chama).
    <div className="relative py-7 md:py-8">
      {/* seta esquerda */}
      <button
        type="button"
        aria-label="Ver marcas anteriores"
        onClick={() => scrollByAmount("left")}
        className={`
          absolute left-0 top-[78px] z-20 hidden
          h-[48px] w-[48px] -translate-x-1/2
          items-center justify-center
          rounded-full border border-ink-200
          bg-white text-ink-800 shadow-subtle
          transition
          lg:flex

          ${canScrollLeft ? "opacity-100 pointer-events-auto hover:bg-warm-100" : "opacity-0 pointer-events-none"}
        `}
      >
        <CaretLeft size={20} weight="bold" />
      </button>

      {/* seta direita */}
      <button
        type="button"
        aria-label="Ver próximas marcas"
        onClick={() => scrollByAmount("right")}
        className={`
          absolute right-0 top-[78px] z-20 hidden
          h-[48px] w-[48px] translate-x-1/2
          items-center justify-center
          rounded-full border border-ink-200
          bg-white text-ink-800 shadow-subtle
          transition
          lg:flex

          ${canScrollRight ? "opacity-100 pointer-events-auto hover:bg-warm-100" : "opacity-0 pointer-events-none"}
        `}
      >
        <CaretRight size={20} weight="bold" />
      </button>

      <div
        ref={scrollRef}
        className="
          no-scrollbar
          flex gap-1 overflow-x-auto
          scroll-smooth
          px-1 pb-2
        "
      >
        {marcas.map((marca) => (
          <a
            key={marca.id}
            href={`/produtos?marca=${marca.id}`}
            className="
              group
              flex min-w-[136px] shrink-0 flex-col items-center
              text-center
              md:min-w-[150px]
              lg:min-w-[162px]
            "
          >
            <div
              className="
                relative
                flex h-[120px] w-[120px]
                items-center justify-center
                transition-transform duration-200
                group-hover:scale-[1.02]
                md:h-[138px] md:w-[138px]
                lg:h-[152px] lg:w-[152px]
              "
            >
              {/* marca.imagem_url é sempre preenchido aqui — a consulta em
                  page.tsx já filtra .not("imagem_url", "is", null), a
                  checagem é só pro tipo (Marca.imagem_url é string | null
                  no banco). */}
              {marca.imagem_url && (
                <Image
                  src={marca.imagem_url}
                  alt={marca.nome}
                  fill
                  sizes="(max-width: 768px) 120px, (max-width: 1024px) 138px, 152px"
                  className="z-[1] object-contain p-[6%]"
                />
              )}
            </div>

            <span
              className="
                mt-4
                max-w-[150px]
                text-[15px]
                font-medium
                leading-tight
                text-ink-900
                transition-colors
                group-hover:text-fhezo-700
                md:text-[16px]
              "
            >
              {marca.nome}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
