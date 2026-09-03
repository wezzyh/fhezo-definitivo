import type { ItemMenu } from "./tipos";

/**
 * Resolve o href de um item de menu em runtime. Para tipo "categoria", o
 * link nunca é digitado à mão pelo admin — é sempre "/produtos?categoria=<slug
 * atual da categoria>", montado aqui a partir de um mapa id → slug (ver
 * obterMapaSlugsCategorias em src/lib/conteudo/consultas.ts). Isso resolve o
 * TODO que existia em nav.tsx antes desta mudança.
 */
export function resolverHrefItemMenu(item: ItemMenu, mapaSlugsCategorias: Record<string, string>): string {
  if (item.tipo === "categoria") {
    const slug = item.categoria_id ? mapaSlugsCategorias[item.categoria_id] : undefined;
    return slug ? `/produtos?categoria=${slug}` : "/produtos";
  }
  if (item.tipo === "link") {
    return item.href || "/produtos";
  }
  return "/produtos";
}
