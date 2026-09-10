import Image from "next/image";
import Link from "next/link";
import { obterDimensoesWebp } from "@/lib/imagens/dimensoes-webp";
import type { Banner } from "@/types/database";
import type { DadosBanner } from "@/lib/conteudo/tipos";

// Faixa de banner fina, full-bleed, abaixo das seções da home — mesma
// estrutura de src/components/home/hero-banner.tsx (imagem única,
// <Link> só quando link_url existe, altura via aspect-ratio real da
// imagem — ver o comentário lá sobre por quê: sem isso, o texto embutido
// na imagem aparecia gigante e cortado em telas largas, porque a altura
// ficava presa a um teto pequeno enquanto a largura crescia livremente).
// Cadastrada em /admin/conteudo/banners com posicao="faixa_institucional".
// next/image sem `priority` (ver hero-banner.tsx): abaixo da dobra, então
// deve continuar de lazy-load, só sem baixar o arquivo bruto do Storage.
// ALTURA_MAXIMA: mesma decisão de hero-banner.tsx — largura sempre 100%,
// altura limitada ao teto de antes (100px) em vez de crescer livre.
const ASPECT_RATIO_PADRAO = "1520 / 100";
const ALTURA_MAXIMA = "100px";

export async function FaixaInstitucional({ banner }: { banner: Banner }) {
  const dados = banner.dados as unknown as DadosBanner;
  const dimensoes = await obterDimensoesWebp(dados.imagem_url);
  const aspectRatio = dimensoes ? `${dimensoes.largura} / ${dimensoes.altura}` : ASPECT_RATIO_PADRAO;

  const imagem = (
    <Image
      src={dados.imagem_url}
      alt={dados.titulo ?? "Faixa institucional"}
      fill
      sizes="100vw"
      quality={90}
      className="object-cover object-center"
    />
  );

  return (
    <section className="w-full bg-ink-950">
      <div className="relative w-full overflow-hidden" style={{ aspectRatio, maxHeight: ALTURA_MAXIMA }}>
        {dados.link_url ? (
          <Link href={dados.link_url} className="block h-full w-full">
            {imagem}
          </Link>
        ) : (
          imagem
        )}
      </div>
    </section>
  );
}
