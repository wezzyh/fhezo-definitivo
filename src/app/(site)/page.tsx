import { obterHomePublicada, obterBannersPublicados, bannersVisiveisAgora, obterSeoPublicado } from "@/lib/conteudo/consultas";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { SecaoCategoriasAutomaticas, SecaoCategoriasDestaque, SecaoProdutosDestaque } from "./secoes-home";
import { HeroBanner } from "@/components/home/hero-banner";
import { FaixaInstitucional } from "@/components/home/faixa-institucional";
import { FaixaBeneficios } from "@/components/home/faixa-beneficios";
import { FaixaMarcas } from "@/components/home/faixa-marcas";
import type { DadosBanner, SecaoProdutosDestaque as TipoSecaoProdutosDestaque } from "@/lib/conteudo/tipos";
import type { Marca } from "@/types/database";
import type { Metadata } from "next";

const SECAO_MAIS_VENDIDOS: TipoSecaoProdutosDestaque = {
  id: "mais-vendidos-fixo",
  tipo: "produtos_destaque",
  ordem: 0,
  ativo: true,
  titulo: "Produtos mais vendidos",
  subtitulo: "",
  modo: "mais_vendidos",
  produto_ids: [],
  categoria_id: null,
  limite: 8,
};

async function buscarMarcasEmDestaque(): Promise<Pick<Marca, "id" | "nome" | "imagem_url">[]> {
  const supabase = await criarClienteSupabaseServidor();
  const { data } = await supabase
    .from("marcas")
    .select("id, nome, imagem_url")
    .eq("ativo", true)
    .not("imagem_url", "is", null)
    .order("ordem")
    .order("nome")
    .limit(7)
    .returns<Pick<Marca, "id" | "nome" | "imagem_url">[]>();
  return data ?? [];
}

// Editável em /admin/conteudo/seo.
export async function generateMetadata(): Promise<Metadata> {
  const seo = await obterSeoPublicado();
  return { title: seo.home.titulo, description: seo.home.descricao };
}

// Home do site público — antes desta mudança era 100% estática (hero fixo
// no JSX + array de produtos mockado). Agora busca a versão publicada de
// conteudo_site (tipo "home") e os banners publicados, editáveis em
// /admin/conteudo/home e /admin/conteudo/banners. O banner principal segue
// literalmente referencia-novo-frontend/src/pages/HomePage.tsx: uma única
// imagem full-width (o primeiro banner publicado e vigente agora), sem
// texto/CTA — por isso o tipo de seção "hero" (título/subtítulo/CTA) foi
// removido do CMS (ver HOME_PADRAO/tipos.ts), a pedido do usuário.
export default async function PaginaInicial() {
  const [dadosHome, bannersPublicados, marcasEmDestaque] = await Promise.all([
    obterHomePublicada(),
    obterBannersPublicados(),
    buscarMarcasEmDestaque(),
  ]);

  const bannersVigentes = bannersVisiveisAgora(bannersPublicados);
  // Banners publicados antes do campo "posicao" existir (migration não
  // aplicada ainda / dado antigo) não têm essa chave — tratados como
  // "hero" na leitura, pra não sumir o banner principal já cadastrado.
  const banner = bannersVigentes.find((b) => ((b.dados as unknown as DadosBanner).posicao ?? "hero") === "hero") ?? null;
  const bannerFaixa =
    bannersVigentes.find((b) => (b.dados as unknown as DadosBanner).posicao === "faixa_institucional") ?? null;

  const temSecaoCategorias = dadosHome.secoes.some(
    (secao) => secao.tipo === "categorias_destaque" && secao.ativo && secao.categoria_ids.length > 0,
  );

  return (
    <>
      {banner && <HeroBanner banner={banner} />}

      <FaixaBeneficios />

      {!temSecaoCategorias && <SecaoCategoriasAutomaticas />}

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

      {bannerFaixa && <FaixaInstitucional banner={bannerFaixa} />}

      <SecaoProdutosDestaque secao={SECAO_MAIS_VENDIDOS} />

      {marcasEmDestaque.length > 0 && (
        <section className="bg-[#f3f3f1]">
          <div className="fhezo-container">
            <h2 className="pt-7 font-display text-2xl font-semibold text-ink-900 md:pt-8">Compre por marca</h2>
            <FaixaMarcas marcas={marcasEmDestaque} />
          </div>
        </section>
      )}
    </>
  );
}
