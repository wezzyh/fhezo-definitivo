"use client";

import { useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { Cube } from "@phosphor-icons/react";

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
 * listener nenhum).
 */
function ImagemComLupa({ url, nome }: { url: string; nome: string }) {
  const comHover = useSyncExternalStore(assinarSuporteAHover, lerSuporteAHover, () => false);
  const [emZoom, setEmZoom] = useState(false);
  const [origem, setOrigem] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  function lidarComMovimento(evento: MouseEvent<HTMLDivElement>) {
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
    <div
      ref={containerRef}
      onMouseMove={comHover ? lidarComMovimento : undefined}
      onMouseLeave={() => setEmZoom(false)}
      className={`relative h-full w-full ${comHover ? "cursor-zoom-in" : ""}`}
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
    </div>
  );
}

// Miniaturas verticais à esquerda + imagem grande — só aparece a coluna de
// miniaturas quando há mais de 1 imagem (produto com só a imagem
// principal continua exatamente como antes).
export function GaleriaProduto({ nome, imagens }: GaleriaProdutoProps) {
  const [selecionada, setSelecionada] = useState(0);

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
        <ImagemComLupa key={imagens[selecionada]} url={imagens[selecionada]} nome={nome} />
      </div>
    </div>
  );
}
