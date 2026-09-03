import Link from "next/link";
import { obterMenuPublicado, obterMapaSlugsCategorias } from "@/lib/conteudo/consultas";
import { resolverHrefItemMenu } from "@/lib/conteudo/resolver-href-menu";
import type { ItemMenu } from "@/lib/conteudo/tipos";

// Menu de categorias do topo do site — busca a versão publicada mais
// recente em conteudo_site (tipo "menu"), editável em /admin/conteudo/menu.
// Antes desta mudança era um array hardcoded aqui mesmo, sempre apontando
// pra /produtos (ver git history / HANDOFF.md).
export async function Nav() {
  const [dadosMenu, mapaSlugs] = await Promise.all([obterMenuPublicado(), obterMapaSlugsCategorias()]);

  return (
    <nav className="flex items-center gap-6 overflow-x-auto text-sm font-medium text-zinc-300">
      {dadosMenu.itens.map((item) => (
        <ItemNav key={item.id} item={item} mapaSlugs={mapaSlugs} />
      ))}
    </nav>
  );
}

function ItemNav({ item, mapaSlugs }: { item: ItemMenu; mapaSlugs: Record<string, string> }) {
  const href = resolverHrefItemMenu(item, mapaSlugs);
  const temFilhos = item.filhos.length > 0;

  return (
    <div className="group relative">
      <Link href={href} className="inline-block whitespace-nowrap py-3 hover:text-brand-green">
        {item.rotulo}
      </Link>

      {/* Desenha só 1 nível de submenu — netos existem no dado (árvore
          recursiva) mas ainda não têm representação visual própria aqui. */}
      {temFilhos && (
        <div className="absolute left-0 top-full z-10 hidden min-w-[12rem] flex-col rounded-md border border-zinc-800 bg-dark py-1 shadow-lg group-hover:flex">
          {item.filhos.map((filho) => (
            <Link
              key={filho.id}
              href={resolverHrefItemMenu(filho, mapaSlugs)}
              className="px-4 py-2 text-sm text-zinc-300 hover:bg-dark-2 hover:text-brand-green"
            >
              {filho.rotulo}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
