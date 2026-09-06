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
export function HeroBanner({ banner }: { banner: Banner }) {
  const dados = banner.dados as unknown as DadosBanner;

  const imagem = (
    // eslint-disable-next-line @next/next/no-img-element -- URL externa cadastrada pelo admin, sem domínio fixo para next/image.
    <img
      src={dados.imagem_url}
      alt={dados.titulo ?? "Banner"}
      className="h-full w-full object-cover object-center"
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
