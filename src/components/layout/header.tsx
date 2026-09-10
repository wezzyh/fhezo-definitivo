import {
  EnvelopeSimple,
  FacebookLogo,
  InstagramLogo,
  MagnifyingGlass,
  Phone,
  TiktokLogo,
  WhatsappLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import {
  obterArvoreCategoriasPublica,
  obterMenuPublicado,
  obterMapaSlugsCategorias,
  obterContatoPublicado,
} from "@/lib/conteudo/consultas";
import { resolverHrefItemMenu } from "@/lib/conteudo/resolver-href-menu";
import { paraTelHref, paraWhatsappHref } from "@/lib/conteudo/telefone";
import { obterClienteLogado } from "@/lib/clientes/sessao";
import { BarraPromocional } from "./barra-promocional";
import { MenuConta } from "@/components/account/menu-conta";
import { MegaMenuDepartamentos } from "@/components/navigation/mega-menu-departamentos";
import { IndicadorCarrinho } from "./indicador-carrinho";
import type { ItemMenu } from "@/lib/conteudo/tipos";

// Copiado literalmente de
// referencia-novo-frontend/src/components/layout/Header.tsx. Diferenças
// apenas onde a referência usava dado mockado:
// - "Departamentos" (MegaMenuDepartamentos) → árvore real de categorias
//   (categoria_pai_id), via obterArvoreCategoriasPublica — 100% automático,
//   sem curadoria manual.
// - Barra de links ao lado de "Departamentos" → conteudo_site tipo "menu",
//   editável em /admin/conteudo/menu (obterMenuPublicado + resolverHrefItemMenu,
//   mesma resolução de href já usada antes em nav.tsx) — curadoria manual do
//   admin (rótulo, categoria/link livre, submenu), diferente do mega menu.
// - Contato/redes sociais: conteudo_site tipo "contato", editável em
//   /admin/conteudo/contato (mesmo dado usado pelo Footer, pra nunca
//   divergirem entre si — ver contato-fixo.ts, removido nessa migração).
// - Busca: continua um <form action="/produtos" method="get"> real (sem
//   lógica nova), só restilizado com as classes escuras da referência.
export async function Header() {
  const [arvoreCategorias, dadosMenu, mapaSlugs, logado, contato] = await Promise.all([
    obterArvoreCategoriasPublica(),
    obterMenuPublicado(),
    obterMapaSlugsCategorias(),
    obterClienteLogado(),
    obterContatoPublicado(),
  ]);
  const clienteMenu = logado?.cliente ? { primeiroNome: logado.cliente.nome.split(" ")[0] } : null;

  return (
    <header className="relative z-50">
      {/* PROMO BAR */}
      <BarraPromocional />

      {/* DARK HEADER */}
      <div className="bg-[#0d111c] text-white">
        {/* CONTACT BAR */}
        <div>
          <div
            className="
              fhezo-container
              hidden h-10
              items-center
              justify-between
              md:flex
            "
          >
            <div className="flex items-center gap-7 text-[13px]">
              <a
                href={`https://wa.me/${paraWhatsappHref(contato.whatsapp)}`}
                target="_blank"
                rel="noreferrer"
                className="
                  flex items-center gap-2
                  font-semibold
                  hover:text-fhezo-300
                "
              >
                <WhatsappLogo size={18} className="text-fhezo-400" />
                WhatsApp
              </a>

              <a
                href={`tel:${paraTelHref(contato.telefone)}`}
                className="
                  flex items-center gap-2
                  font-semibold
                  hover:text-fhezo-300
                "
              >
                <Phone size={18} className="text-fhezo-400" />
                {contato.telefone}
              </a>

              <a
                href={`mailto:${contato.email}`}
                className="
                  flex items-center gap-2
                  font-semibold
                  hover:text-fhezo-300
                "
              >
                <EnvelopeSimple size={18} className="text-fhezo-400" />
                {contato.email}
              </a>
            </div>

            <div className="flex items-center gap-5 text-ink-200">
              {contato.redesSociais.instagram && (
                <a href={contato.redesSociais.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-fhezo-300">
                  <InstagramLogo size={17} />
                </a>
              )}
              {contato.redesSociais.facebook && (
                <a href={contato.redesSociais.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="hover:text-fhezo-300">
                  <FacebookLogo size={17} />
                </a>
              )}
              {contato.redesSociais.youtube && (
                <a href={contato.redesSociais.youtube} target="_blank" rel="noreferrer" aria-label="YouTube" className="hover:text-fhezo-300">
                  <YoutubeLogo size={18} />
                </a>
              )}
              {contato.redesSociais.tiktok && (
                <a href={contato.redesSociais.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok" className="hover:text-fhezo-300">
                  <TiktokLogo size={17} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* MAIN HEADER */}
        <div className="bg-[#151821]">
          <div
            className="
              fhezo-container
              flex h-[92px]
              items-center gap-5
              lg:gap-9
            "
          >
            <Link
              href="/"
              className="
                flex w-[170px]
                shrink-0
                items-center
                lg:w-[205px]
              "
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG de marca, não precisa do otimizador de imagens */}
              <img
                src="/fhezo-industrial-logo-exact.svg"
                alt="Fhezo Industrial"
                className="max-h-[58px] w-full object-contain object-left"
              />
            </Link>

            <form action="/produtos" method="get" className="group relative min-w-0 flex-1">
              <input
                type="search"
                name="busca"
                placeholder="Busque por produto, código, medida ou marca"
                aria-label="Buscar produtos"
                className="
                  h-[54px] w-full
                  rounded-fhezo
                  border-2 border-[#272d3d]
                  bg-[#151821]
                  pl-5 pr-[62px]
                  text-[15px]
                  text-white
                  outline-none
                  transition
                  placeholder:text-ink-300
                  focus:border-fhezo-500
                  focus:bg-[#151821]
                  lg:text-base
                "
              />

              <button
                type="submit"
                className="
                  absolute right-[5px] top-[5px]
                  flex h-11 w-11
                  rounded-fhezo
                  items-center justify-center
                  text-ink-300
                  transition
                  group-focus-within:text-fhezo-400
                  hover:text-fhezo-300
                "
                aria-label="Buscar"
              >
                <MagnifyingGlass size={21} weight="bold" />
              </button>
            </form>

            <div className="flex shrink-0 items-center gap-5">
              <MenuConta cliente={clienteMenu} />

              <IndicadorCarrinho />
            </div>
          </div>
        </div>

        {/* NAV */}
        <nav className="relative">
          <div
            className="
              fhezo-container
              flex h-[50px]
              items-center
            "
          >
            <MegaMenuDepartamentos departamentos={arvoreCategorias} />

            <div
              className="
                ml-7
                flex min-w-0 flex-1
                items-center gap-7
                overflow-x-auto
                no-scrollbar
              "
            >
              {dadosMenu.itens.map((item) => (
                <ItemMenuTopo key={item.id} item={item} mapaSlugs={mapaSlugs} />
              ))}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}

// Item da barra de menu ao lado de "Departamentos" — vem de conteudo_site
// tipo "menu" (editável em /admin/conteudo/menu). Desenha só 1 nível de
// dropdown (mesma limitação que já existia em nav.tsx): itens netos
// existem no dado mas aparecem achatados dentro do dropdown do pai.
function ItemMenuTopo({ item, mapaSlugs }: { item: ItemMenu; mapaSlugs: Record<string, string> }) {
  const href = resolverHrefItemMenu(item, mapaSlugs);
  const temFilhos = item.filhos.length > 0;

  return (
    <div className="group relative shrink-0">
      <Link
        href={href}
        className="
          flex items-center
          font-display
          text-[13px]
          font-semibold
          uppercase
          tracking-[.01em]
          text-ink-100
          transition-colors
          hover:text-fhezo-400
        "
      >
        {item.rotulo}
      </Link>

      {temFilhos && (
        <div
          className="
            invisible absolute left-0 top-full z-[150]
            min-w-[210px]
            translate-y-[3px]
            rounded-[12px]
            bg-[#151821]
            p-2
            pt-[10px]
            opacity-0
            shadow-[0_18px_50px_rgba(0,0,0,.28)]
            transition
            duration-150
            group-hover:visible
            group-hover:translate-y-0
            group-hover:opacity-100
          "
        >
          {item.filhos.map((filho) => (
            <Link
              key={filho.id}
              href={resolverHrefItemMenu(filho, mapaSlugs)}
              className="
                flex h-9 items-center
                rounded-[8px]
                px-3
                text-[13px]
                normal-case
                tracking-normal
                text-[#c2c6cd]
                transition-colors
                duration-150
                hover:bg-[#1c212a]
                hover:text-white
              "
            >
              {filho.rotulo}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
