import Link from "next/link";
import type { Banner } from "@/types/database";
import type { DadosBanner } from "@/lib/conteudo/tipos";

// Faixa de banner fina, full-bleed, abaixo das seções da home — mesma
// estrutura de src/components/home/hero-banner.tsx (imagem única,
// <Link> só quando link_url existe), só com altura bem menor (~100px no
// desktop) porque aqui é uma faixa institucional, não o banner principal.
// Cadastrada em /admin/conteudo/banners com posicao="faixa_institucional".
export function FaixaInstitucional({ banner }: { banner: Banner }) {
  const dados = banner.dados as unknown as DadosBanner;

  const imagem = (
    // eslint-disable-next-line @next/next/no-img-element -- URL externa cadastrada pelo admin, sem domínio fixo para next/image.
    <img src={dados.imagem_url} alt={dados.titulo ?? "Faixa institucional"} className="h-full w-full object-cover object-center" />
  );

  return (
    <section className="w-full bg-ink-950">
      <div className="relative h-[60px] overflow-hidden sm:h-[80px] lg:h-[100px]">
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
