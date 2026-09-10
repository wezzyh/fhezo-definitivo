import Image from "next/image";
import Link from "next/link";
import type { Banner } from "@/types/database";
import type { DadosBanner } from "@/lib/conteudo/tipos";

// Copiado literalmente de
// referencia-novo-frontend/src/components/home/HeroBanner.tsx: uma única
// imagem full-width, sem texto/CTA. Diferença necessária em relação à
// referência (que usa um <img> solto, sem link): o banner real cadastrado
// em /admin/conteudo/banners tem link_url opcional, então a imagem só vira
// <Link> quando esse campo está preenchido — sem isso a funcionalidade de
// clique nos banners (já existente antes desta integração) seria perdida.
// next/image com `priority` (ver next.config.ts para o remotePattern do
// Storage): este banner é o maior elemento acima da dobra da home, ou seja
// o candidato a LCP da página — priority pula o lazy-loading padrão e
// injeta um <link rel="preload">, e o otimizador converte pra
// AVIF/WebP no tamanho real de cada viewport em vez de servir o arquivo
// bruto do Storage.
export function HeroBanner({ banner }: { banner: Banner }) {
  const dados = banner.dados as unknown as DadosBanner;

  const imagem = (
    <Image
      src={dados.imagem_url}
      alt={dados.titulo ?? "Banner"}
      fill
      priority
      sizes="100vw"
      className="object-cover object-center"
    />
  );

  return (
    <section className="w-full bg-ink-950">
      <div
        className="
          relative
          h-[200px]
          overflow-hidden
          sm:h-[250px]
          md:h-[290px]
          lg:h-[330px]
          xl:h-[360px]
        "
      >
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
