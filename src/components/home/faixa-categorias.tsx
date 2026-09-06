"use client";

import { CaretLeft, CaretRight, Cube } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export interface CategoriaFaixa {
  id: string;
  nome: string;
  slug: string;
}

// Copiado literalmente de
// referencia-novo-frontend/src/components/home/CategoriesStrip.tsx (Link
// do react-router-dom trocado por next/link; dado estático de
// data/categories.ts trocado pelas categorias reais recebidas via prop).
// Diferença necessária: "categorias" não tem coluna de imagem no banco
// (só produtos têm imagem_url) — sem imagem real disponível, cada card usa
// o ícone Cube como espaço reservado, mesmo padrão de fallback já usado em
// CartaoProduto/CarrinhoDrawer para produto sem imagem.
export function FaixaCategorias({ categorias }: { categorias: CategoriaFaixa[] }) {
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
              <Cube size={40} weight="thin" className="text-ink-300" />
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
