"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Categoria } from "@/types/database";

type FaixaCategoriasProps = {
  categorias: Pick<Categoria, "id" | "nome" | "slug" | "imagem_url">[];
};

// Copiado de referencia-novo-frontend/src/components/home/CategoriesStrip.tsx
// (Link do react-router-dom trocado por next/link, href trocado pela rota
// real de filtro — /produtos?categoria=<slug>, não /categoria/<slug>, que
// não existe neste app). Usa categorias.imagem_url quando cadastrada (ver
// migração 0020); sem imagem, cai na inicial do nome como fallback, mesmo
// padrão de FaixaMarcas.
export function FaixaCategorias({ categorias }: FaixaCategoriasProps) {
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
    <div className="relative py-7 md:py-8">
      {/* seta esquerda */}
      <button
        type="button"
        aria-label="Ver categorias anteriores"
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
        aria-label="Ver próximas categorias"
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
        {categorias.map((categoria) => (
          <Link
            key={categoria.id}
            href={`/produtos?categoria=${categoria.slug}`}
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
                rounded-full
                bg-warm-100
                transition-transform duration-200
                group-hover:scale-[1.02]
                md:h-[138px] md:w-[138px]
                lg:h-[152px] lg:w-[152px]
              "
            >
              {categoria.imagem_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL do Storage cadastrada pelo admin.
                <img
                  src={categoria.imagem_url}
                  alt={categoria.nome}
                  loading="lazy"
                  className="relative z-[1] h-[88%] w-[88%] object-contain"
                />
              ) : (
                <span className="font-display text-4xl font-semibold text-fhezo-700">
                  {categoria.nome.charAt(0).toUpperCase()}
                </span>
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
              {categoria.nome}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
