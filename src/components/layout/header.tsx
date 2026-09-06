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
import { obterArvoreCategoriasPublica } from "@/lib/conteudo/consultas";
import { obterClienteLogado } from "@/lib/clientes/sessao";
import { CONTATO_FIXO } from "@/lib/conteudo/contato-fixo";
import { BarraPromocional } from "./barra-promocional";
import { MenuConta } from "@/components/account/menu-conta";
import { MegaMenuDepartamentos } from "@/components/navigation/mega-menu-departamentos";
import { IndicadorCarrinho } from "./indicador-carrinho";

// Copiado literalmente de
// referencia-novo-frontend/src/components/layout/Header.tsx. Diferenças
// apenas onde a referência usava dado mockado:
// - "categories" (lista fixa) e o mega menu → árvore real de categorias
//   (categoria_pai_id), via obterArvoreCategoriasPublica.
// - Contato/redes sociais: sem dado real cadastrado no projeto ainda —
//   mantidos os valores literais da referência (decisão do usuário).
// - Busca: continua um <form action="/produtos" method="get"> real (sem
//   lógica nova), só restilizado com as classes escuras da referência.
export async function Header() {
  const [arvoreCategorias, logado] = await Promise.all([obterArvoreCategoriasPublica(), obterClienteLogado()]);
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
                href="#"
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
                href={`tel:${CONTATO_FIXO.telefoneTel}`}
                className="
                  flex items-center gap-2
                  font-semibold
                  hover:text-fhezo-300
                "
              >
                <Phone size={18} className="text-fhezo-400" />
                {CONTATO_FIXO.telefoneExibicao}
              </a>

              <a
                href={`mailto:${CONTATO_FIXO.email}`}
                className="
                  flex items-center gap-2
                  font-semibold
                  hover:text-fhezo-300
                "
              >
                <EnvelopeSimple size={18} className="text-fhezo-400" />
                {CONTATO_FIXO.email}
              </a>
            </div>

            <div className="flex items-center gap-5 text-ink-200">
              <InstagramLogo size={17} />
              <FacebookLogo size={17} />
              <YoutubeLogo size={18} />
              <TiktokLogo size={17} />
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
              {arvoreCategorias.map((categoria) => (
                <Link
                  key={categoria.id}
                  href={categoria.href}
                  className="
                    shrink-0
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
                  {categoria.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
