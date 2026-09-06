import { obterHomePublicada, obterBannersPublicados, bannersVisiveisAgora } from "@/lib/conteudo/consultas";
import { SecaoCategoriasDestaque, SecaoProdutosDestaque } from "./secoes-home";
import { HeroBanner } from "@/components/home/hero-banner";
import { FaixaBeneficios } from "@/components/home/faixa-beneficios";

// Home do site público — antes desta mudança era 100% estática (hero fixo
// no JSX + array de produtos mockado). Agora busca a versão publicada de
// conteudo_site (tipo "home") e os banners publicados, editáveis em
// /admin/conteudo/home e /admin/conteudo/banners. O banner principal segue
// literalmente referencia-novo-frontend/src/pages/HomePage.tsx: uma única
// imagem full-width (o primeiro banner publicado e vigente agora), sem
// texto/CTA — por isso o tipo de seção "hero" (título/subtítulo/CTA) foi
// removido do CMS (ver HOME_PADRAO/tipos.ts), a pedido do usuário.
export default async function PaginaInicial() {
  const [dadosHome, bannersPublicados] = await Promise.all([obterHomePublicada(), obterBannersPublicados()]);
  const banner = bannersVisiveisAgora(bannersPublicados)[0] ?? null;

  return (
    <>
      {banner && <HeroBanner banner={banner} />}

      <FaixaBeneficios />

      {dadosHome.secoes
        .filter((secao) => secao.ativo)
        .slice()
        .sort((a, b) => a.ordem - b.ordem)
        .map((secao) => {
          switch (secao.tipo) {
            case "categorias_destaque":
              return <SecaoCategoriasDestaque key={secao.id} secao={secao} />;
            case "produtos_destaque":
              return <SecaoProdutosDestaque key={secao.id} secao={secao} />;
            default:
              return null;
          }
        })}
    </>
  );
}
