import { unstable_cache } from "next/cache";
import { criarClienteSupabasePublico } from "@/lib/supabase/publico";
import type { ConteudoSite, TipoConteudoSite, Banner, PaginaInstitucional } from "@/types/database";
import type { DadosMenu, DadosHome, DadosTema, DadosBanner, DadosFooter, DadosSeo, DadosContato } from "./tipos";
import { MENU_PADRAO, HOME_PADRAO, TEMA_PADRAO, FOOTER_PADRAO, SEO_PADRAO, CONTATO_PADRAO } from "./padroes";

// Leituras públicas (site) de conteúdo versionado — sempre a versão mais
// recente com publicado=true de cada tipo, nunca o histórico. Cacheadas
// com unstable_cache: a publicação/restauração no admin invalida na hora
// via updateTag (ver actions.ts de cada tela em src/app/admin/conteudo/*
// — updateTag em vez de revalidateTag porque roda dentro de Server Actions
// e dá semântica "read-your-own-writes": o admin vê o efeito imediatamente
// após publicar, sem esperar uma janela de stale-while-revalidate),
// e REVALIDATE_SEGUNDOS é só uma rede de segurança para o caso de o dado
// mudar por fora desse fluxo.
//
// Usa um cliente Supabase sem cookies (criarClienteSupabasePublico) porque
// unstable_cache proíbe chamar APIs dinâmicas (como cookies()) no corpo da
// função cacheada — o cliente "de servidor" normal (criarClienteSupabaseServidor)
// não pode ser usado aqui. Páginas do /admin continuam lendo direto pelo
// cliente normal, sem cache, para sempre editar contra o dado mais atual.
const REVALIDATE_SEGUNDOS = 300;

async function buscarPublicado(tipo: TipoConteudoSite): Promise<ConteudoSite | null> {
  const supabase = criarClienteSupabasePublico();
  const { data } = await supabase
    .from("conteudo_site")
    .select("*")
    .eq("tipo", tipo)
    .eq("publicado", true)
    .maybeSingle<ConteudoSite>();
  return data;
}

export const obterMenuPublicado = unstable_cache(
  async (): Promise<DadosMenu> => {
    const conteudo = await buscarPublicado("menu");
    return (conteudo?.dados as DadosMenu | undefined) ?? MENU_PADRAO;
  },
  ["conteudo-site-menu"],
  { tags: ["conteudo-menu"], revalidate: REVALIDATE_SEGUNDOS },
);

export const obterHomePublicada = unstable_cache(
  async (): Promise<DadosHome> => {
    const conteudo = await buscarPublicado("home");
    return (conteudo?.dados as DadosHome | undefined) ?? HOME_PADRAO;
  },
  ["conteudo-site-home"],
  { tags: ["conteudo-home"], revalidate: REVALIDATE_SEGUNDOS },
);

export const obterTemaPublicado = unstable_cache(
  async (): Promise<DadosTema> => {
    const conteudo = await buscarPublicado("tema");
    return (conteudo?.dados as DadosTema | undefined) ?? TEMA_PADRAO;
  },
  ["conteudo-site-tema"],
  { tags: ["conteudo-tema"], revalidate: REVALIDATE_SEGUNDOS },
);

export const obterFooterPublicado = unstable_cache(
  async (): Promise<DadosFooter> => {
    const conteudo = await buscarPublicado("footer");
    return (conteudo?.dados as DadosFooter | undefined) ?? FOOTER_PADRAO;
  },
  ["conteudo-site-footer"],
  { tags: ["conteudo-footer"], revalidate: REVALIDATE_SEGUNDOS },
);

export const obterSeoPublicado = unstable_cache(
  async (): Promise<DadosSeo> => {
    const conteudo = await buscarPublicado("seo");
    return (conteudo?.dados as DadosSeo | undefined) ?? SEO_PADRAO;
  },
  ["conteudo-site-seo"],
  { tags: ["conteudo-seo"], revalidate: REVALIDATE_SEGUNDOS },
);

/** Telefone, WhatsApp, e-mail, endereço e redes sociais — usado por Header e Footer, editável em /admin/conteudo/contato. */
export const obterContatoPublicado = unstable_cache(
  async (): Promise<DadosContato> => {
    const conteudo = await buscarPublicado("contato");
    return (conteudo?.dados as DadosContato | undefined) ?? CONTATO_PADRAO;
  },
  ["conteudo-site-contato"],
  { tags: ["conteudo-contato"], revalidate: REVALIDATE_SEGUNDOS },
);

/** Páginas institucionais ativas (Sobre nós, Política de privacidade, etc.), editadas em /admin/conteudo/paginas — usado pelo footer para saber para quais dessas existe um link real, e pela rota pública /institucional/[slug]. */
export const obterPaginasInstitucionaisPublicadas = unstable_cache(
  async (): Promise<Pick<PaginaInstitucional, "slug" | "titulo">[]> => {
    const supabase = criarClienteSupabasePublico();
    const { data } = await supabase
      .from("paginas_institucionais")
      .select("slug, titulo")
      .eq("ativo", true)
      .returns<Pick<PaginaInstitucional, "slug" | "titulo">[]>();
    return data ?? [];
  },
  ["paginas-institucionais-publicadas"],
  { tags: ["conteudo-paginas"], revalidate: REVALIDATE_SEGUNDOS },
);

export const obterBannersPublicados = unstable_cache(
  async (): Promise<Banner[]> => {
    const supabase = criarClienteSupabasePublico();
    const { data } = await supabase.from("banners").select("*").eq("publicado", true).returns<Banner[]>();
    return data ?? [];
  },
  ["banners-publicados"],
  { tags: ["conteudo-banners"], revalidate: REVALIDATE_SEGUNDOS },
);

/** Mapa categoria_id → slug, para resolver o href de itens de menu do tipo "categoria" (ver resolverHrefItemMenu). Só categorias ativas. */
export const obterMapaSlugsCategorias = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const supabase = criarClienteSupabasePublico();
    const { data } = await supabase
      .from("categorias")
      .select("id, slug")
      .eq("ativo", true)
      .returns<{ id: string; slug: string }[]>();
    return Object.fromEntries((data ?? []).map((categoria) => [categoria.id, categoria.slug]));
  },
  ["categorias-slugs"],
  { tags: ["categorias"], revalidate: REVALIDATE_SEGUNDOS },
);

export interface DepartamentoPublico {
  id: string;
  label: string;
  href: string;
  children?: DepartamentoPublico[];
}

/**
 * Árvore de categorias ativas (via categoria_pai_id, até 3 níveis: topo →
 * subcategoria → neta) no formato consumido pelo mega menu do header
 * (src/components/navigation/mega-menu-departamentos.tsx). Cada nó vira um
 * link para "/produtos?categoria=<slug>" (mesmo filtro exato-por-categoria
 * já usado em /produtos, sem incluir descendentes).
 */
export const obterArvoreCategoriasPublica = unstable_cache(
  async (): Promise<DepartamentoPublico[]> => {
    const supabase = criarClienteSupabasePublico();
    const { data } = await supabase
      .from("categorias")
      .select("id, nome, slug, categoria_pai_id, ordem")
      .eq("ativo", true)
      .returns<{ id: string; nome: string; slug: string; categoria_pai_id: string | null; ordem: number }[]>();

    const categorias = data ?? [];
    const filhosPorPai = new Map<string | null, typeof categorias>();
    for (const categoria of categorias) {
      const lista = filhosPorPai.get(categoria.categoria_pai_id);
      if (lista) {
        lista.push(categoria);
      } else {
        filhosPorPai.set(categoria.categoria_pai_id, [categoria]);
      }
    }
    for (const lista of filhosPorPai.values()) {
      lista.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
    }

    function montar(paiId: string | null): DepartamentoPublico[] {
      return (filhosPorPai.get(paiId) ?? []).map((categoria) => {
        const filhos = montar(categoria.id);
        return {
          id: categoria.id,
          label: categoria.nome,
          href: `/produtos?categoria=${categoria.slug}`,
          ...(filhos.length > 0 ? { children: filhos } : {}),
        };
      });
    }

    return montar(null);
  },
  ["categorias-arvore-publica"],
  { tags: ["categorias"], revalidate: REVALIDATE_SEGUNDOS },
);

/**
 * Filtra banners publicados para o que deve aparecer AGORA: ativo=true e
 * dentro da janela de vigência (data_inicio/data_fim). Deliberadamente FORA
 * do cache acima — a lista cacheada inclui banners futuros/expirados, e
 * esse filtro por data precisa reavaliar a cada request (o cache não é
 * invalidado só porque o relógio virou o dia). Ordenado por "ordem".
 */
export function bannersVisiveisAgora(banners: Banner[]): Banner[] {
  const agora = Date.now();
  return banners
    .filter((banner) => {
      const dados = banner.dados as unknown as DadosBanner;
      if (!dados.ativo) return false;
      if (dados.data_inicio && new Date(dados.data_inicio).getTime() > agora) return false;
      if (dados.data_fim && new Date(dados.data_fim).getTime() + 24 * 60 * 60 * 1000 - 1 < agora) return false;
      return true;
    })
    .sort((a, b) => (a.dados as unknown as DadosBanner).ordem - (b.dados as unknown as DadosBanner).ordem);
}
