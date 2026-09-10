import Image from "next/image";
import Link from "next/link";
import { obterDimensoesWebp } from "@/lib/imagens/dimensoes-webp";
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
//
// Altura via aspect-ratio real da imagem (lido do próprio arquivo, ver
// obterDimensoesWebp) em vez de uma altura fixa/clamp() arbitrária: como o
// banner é sempre 100vw (full-bleed) e a largura da tela varia muito mais
// que qualquer altura fixa escolhida a dedo, uma altura desacoplada da
// proporção real da imagem eventualmente força uma proporção
// largura:altura muito diferente da original — nessa hora object-cover
// "dá zoom" pra cobrir o espaço e corta quase tudo, mostrando só um
// pedaço gigante e ilegível da imagem (bug real visto em produção com a
// versão anterior, de clamp() com teto de altura pequeno). Com
// aspect-ratio batendo com a imagem de verdade, a altura acompanha a
// largura proporcionalmente — nunca distorce. Sem essa informação (probe
// falhou — rede, formato inesperado), cai num aspect-ratio de segurança
// que reproduz a faixa de altura usada antes desta mudança.
//
// ALTURA_MAXIMA: decisão explícita do usuário — em telas muito largas,
// respeitar 100% a proporção real deixava o banner alto demais (largura
// sempre 100vw, sem teto nenhum de altura). Prefere manter a largura
// sempre 100% e voltar a limitar a altura (mesmo teto de antes, 360px),
// mesmo que isso volte a cortar um pouco as bordas em tela muito larga —
// mas como a proporção de base continua correta, esse corte fica
// moderado (~parecido com qualquer hero banner responsivo comum), bem
// diferente do corte catastrófico do bug com teto de 100px.
const ASPECT_RATIO_PADRAO = "1520 / 360";
const ALTURA_MAXIMA = "360px";

export async function HeroBanner({ banner }: { banner: Banner }) {
  const dados = banner.dados as unknown as DadosBanner;
  const dimensoes = await obterDimensoesWebp(dados.imagem_url);
  const aspectRatio = dimensoes ? `${dimensoes.largura} / ${dimensoes.altura}` : ASPECT_RATIO_PADRAO;

  const imagem = (
    <Image
      src={dados.imagem_url}
      alt={dados.titulo ?? "Banner"}
      fill
      priority
      sizes="100vw"
      quality={90}
      className="object-cover object-center"
    />
  );

  return (
    <section className="w-full bg-ink-950">
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio, maxHeight: ALTURA_MAXIMA }}
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
