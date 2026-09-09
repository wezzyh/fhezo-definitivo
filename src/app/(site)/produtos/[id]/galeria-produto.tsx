"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { Cube, X, CaretLeft, CaretRight } from "@phosphor-icons/react";

interface GaleriaProdutoProps {
  nome: string;
  /** Já combinada e deduplicada: imagem principal (produtos.imagem_url) primeiro, depois a galeria (produto_imagens) — ver produtos/[id]/page.tsx. */
  imagens: string[];
}

// Nível de ampliação da lupa: 2.2x é o suficiente pra ler detalhe fino
// (ex.: texto gravado num rolamento) sem distorcer tanto que perde o
// contexto do resto da peça.
const NIVEL_ZOOM = 220;

const CONSULTA_HOVER_FINO = "(hover: hover) and (pointer: fine)";

function lerSuporteAHover(): boolean {
  return window.matchMedia(CONSULTA_HOVER_FINO).matches;
}

function assinarSuporteAHover(avisar: () => void): () => void {
  const consulta = window.matchMedia(CONSULTA_HOVER_FINO);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

/**
 * Lupa de zoom na imagem principal: ao passar o mouse, uma segunda camada
 * (mesma imagem, ampliada via background-position) aparece por cima da
 * imagem normal e acompanha o cursor. Preferido a escalar a própria <img>
 * via transform porque atualizar background-position a cada movimento do
 * mouse não sofre do lag/"elástico" que mexer em transform-origin a cada
 * frame costuma causar — o rastreamento fica instantâneo, só a
 * entrada/saída do zoom (opacidade) é suavizada.
 *
 * Só ativa em dispositivos com mouse de verdade (hover + ponteiro fino) —
 * em touch não existe "passar o mouse", então a lupa fica desligada e a
 * imagem funciona exatamente como antes (sem cursor de zoom, sem
 * listener nenhum). O clique pra abrir em tela cheia funciona sempre,
 * com ou sem lupa.
 */
function ImagemComLupa({ url, nome, aoClicar }: { url: string; nome: string; aoClicar: () => void }) {
  const comHover = useSyncExternalStore(assinarSuporteAHover, lerSuporteAHover, () => false);
  const [emZoom, setEmZoom] = useState(false);
  const [origem, setOrigem] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLButtonElement>(null);

  function lidarComMovimento(evento: MouseEvent<HTMLButtonElement>) {
    const container = containerRef.current;
    if (!container) return;

    const retangulo = container.getBoundingClientRect();
    const x = ((evento.clientX - retangulo.left) / retangulo.width) * 100;
    const y = ((evento.clientY - retangulo.top) / retangulo.height) * 100;
    setOrigem({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
    // Liga o zoom aqui mesmo (não só no onMouseEnter): garante o estado
    // correto mesmo se o navegador não disparar um "mouseenter" limpo
    // antes do primeiro "mousemove" (acontece com input sintético).
    setEmZoom(true);
  }

  return (
    <button
      type="button"
      ref={containerRef}
      onClick={aoClicar}
      onMouseMove={comHover ? lidarComMovimento : undefined}
      onMouseLeave={() => setEmZoom(false)}
      aria-label={`Ampliar imagem de ${nome}`}
      className={`relative h-full w-full ${comHover ? "cursor-zoom-in" : "cursor-pointer"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- URL externa arbitrária cadastrada pelo admin, sem domínio fixo para next/image. */}
      <img
        src={url}
        alt={nome}
        className="h-full max-h-[440px] w-full object-contain transition-opacity duration-150 ease-out"
        style={emZoom ? { opacity: 0 } : undefined}
      />

      {comHover && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-fhezo bg-white bg-no-repeat opacity-0 transition-opacity duration-150 ease-out"
          style={{
            opacity: emZoom ? 1 : 0,
            backgroundImage: `url(${url})`,
            backgroundSize: `${NIVEL_ZOOM}%`,
            backgroundPosition: `${origem.x}% ${origem.y}%`,
          }}
        />
      )}
    </button>
  );
}

interface LightboxProps {
  nome: string;
  imagens: string[];
  indiceInicial: number;
  aoFechar: () => void;
}

/** Visualização em tela cheia — abre no clique da imagem principal, com navegação entre as fotos da galeria (quando há mais de uma) e fecha por X, clique fora ou Esc. */
function Lightbox({ nome, imagens, indiceInicial, aoFechar }: LightboxProps) {
  const [indice, setIndice] = useState(indiceInicial);

  useEffect(() => {
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") aoFechar();
      if (evento.key === "ArrowRight") setIndice((atual) => (atual + 1) % imagens.length);
      if (evento.key === "ArrowLeft") setIndice((atual) => (atual - 1 + imagens.length) % imagens.length);
    }
    window.addEventListener("keydown", aoTeclar);

    return () => {
      document.body.style.overflow = overflowOriginal;
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [aoFechar, imagens.length]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Imagem ampliada de ${nome}`}
      onClick={aoFechar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/90 p-4 sm:p-10"
    >
      <button
        type="button"
        onClick={aoFechar}
        aria-label="Fechar"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:right-6 sm:top-6"
      >
        <X size={24} weight="bold" />
      </button>

      {imagens.length > 1 && (
        <>
          <button
            type="button"
            onClick={(evento) => {
              evento.stopPropagation();
              setIndice((atual) => (atual - 1 + imagens.length) % imagens.length);
            }}
            aria-label="Imagem anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:left-6"
          >
            <CaretLeft size={24} weight="bold" />
          </button>
          <button
            type="button"
            onClick={(evento) => {
              evento.stopPropagation();
              setIndice((atual) => (atual + 1) % imagens.length);
            }}
            aria-label="Próxima imagem"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:right-6"
          >
            <CaretRight size={24} weight="bold" />
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element -- URL externa arbitrária cadastrada pelo admin, sem domínio fixo para next/image. */}
      <img
        src={imagens[indice]}
        alt={nome}
        onClick={(evento) => evento.stopPropagation()}
        className="max-h-full max-w-full cursor-default object-contain"
      />

      {imagens.length > 1 && (
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white sm:bottom-6">
          {indice + 1} / {imagens.length}
        </span>
      )}
    </div>
  );
}

// Miniaturas verticais à esquerda + imagem grande — só aparece a coluna de
// miniaturas quando há mais de 1 imagem (produto com só a imagem
// principal continua exatamente como antes).
export function GaleriaProduto({ nome, imagens }: GaleriaProdutoProps) {
  const [selecionada, setSelecionada] = useState(0);
  const [lightboxAberta, setLightboxAberta] = useState(false);

  if (imagens.length === 0) {
    return (
      <div className="flex min-h-[320px] w-full items-center justify-center rounded-fhezo bg-warm-50 p-6 lg:min-h-[480px]">
        <Cube size={96} weight="thin" className="text-ink-200" />
      </div>
    );
  }

  return (
    <div className="flex w-full gap-3">
      {imagens.length > 1 && (
        <div className="flex shrink-0 flex-col gap-2">
          {imagens.map((url, indice) => (
            <button
              key={url + indice}
              type="button"
              onClick={() => setSelecionada(indice)}
              aria-label={`Ver imagem ${indice + 1} de ${nome}`}
              className={`h-16 w-16 overflow-hidden rounded-fhezo border-2 bg-warm-50 transition ${
                indice === selecionada ? "border-fhezo-600" : "border-transparent hover:border-ink-200"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URL externa arbitrária cadastrada pelo admin. */}
              <img src={url} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-[320px] flex-1 items-center justify-center overflow-hidden rounded-fhezo bg-warm-50 p-6 lg:min-h-[480px]">
        <ImagemComLupa
          key={imagens[selecionada]}
          url={imagens[selecionada]}
          nome={nome}
          aoClicar={() => setLightboxAberta(true)}
        />
      </div>

      {lightboxAberta && (
        <Lightbox
          nome={nome}
          imagens={imagens}
          indiceInicial={selecionada}
          aoFechar={() => setLightboxAberta(false)}
        />
      )}
    </div>
  );
}
