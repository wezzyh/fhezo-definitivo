import Link from "next/link";
import { obterHomePublicada, obterBannersPublicados, bannersVisiveisAgora } from "@/lib/conteudo/consultas";
import { SecaoHero, SecaoCategoriasDestaque, SecaoProdutosDestaque } from "./secoes-home";
import type { DadosBanner } from "@/lib/conteudo/tipos";

// Home do site público — antes desta mudança era 100% estática (hero fixo
// no JSX + array de produtos mockado). Agora busca a versão publicada de
// conteudo_site (tipo "home") e os banners publicados, editáveis em
// /admin/conteudo/home e /admin/conteudo/banners.
export default async function PaginaInicial() {
  const [dadosHome, bannersPublicados] = await Promise.all([obterHomePublicada(), obterBannersPublicados()]);
  const banners = bannersVisiveisAgora(bannersPublicados);

  return (
    <div className="bg-page">
      {banners.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex gap-4 overflow-x-auto">
            {banners.map((banner) => {
              const dados = banner.dados as unknown as DadosBanner;
              const imagem = (
                // eslint-disable-next-line @next/next/no-img-element -- URL externa cadastrada pelo admin, sem domínio fixo para next/image.
                <img
                  src={dados.imagem_url}
                  alt={dados.titulo ?? ""}
                  className="h-40 w-full shrink-0 rounded-md object-cover sm:w-80"
                />
              );
              return dados.link_url ? (
                <Link key={banner.banner_id} href={dados.link_url} className="shrink-0">
                  {imagem}
                </Link>
              ) : (
                <div key={banner.banner_id} className="shrink-0">
                  {imagem}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {dadosHome.secoes
        .filter((secao) => secao.ativo)
        .slice()
        .sort((a, b) => a.ordem - b.ordem)
        .map((secao) => {
          switch (secao.tipo) {
            case "hero":
              return <SecaoHero key={secao.id} secao={secao} />;
            case "categorias_destaque":
              return <SecaoCategoriasDestaque key={secao.id} secao={secao} />;
            case "produtos_destaque":
              return <SecaoProdutosDestaque key={secao.id} secao={secao} />;
            default:
              return null;
          }
        })}
    </div>
  );
}
