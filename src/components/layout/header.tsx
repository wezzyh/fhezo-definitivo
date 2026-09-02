import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IndicadorCarrinho } from "./indicador-carrinho";
import { Nav } from "./nav";

// Header com as 4 camadas da identidade visual Fhezo Industrial:
// 1) aviso promocional, 2) contato/redes sociais, 3) busca+logo+carrinho,
// 4) categorias.
export function Header() {
  return (
    <header className="sticky top-0 z-50">
      <div className="bg-brand-green px-4 py-2 text-center text-xs font-medium text-white">
        Frete grátis para compras acima de R$ 500 em todo o Brasil
      </div>

      <div className="bg-dark px-4 py-2 text-xs text-zinc-300">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <a href="tel:+551140000000" className="font-medium hover:text-brand-green">
              (11) 4000-0000
            </a>
            <a href="mailto:contato@fhezoindustrial.com.br" className="hover:text-brand-green">
              contato@fhezoindustrial.com.br
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/institucional" className="hover:text-brand-green">
              Institucional
            </Link>
            <Link href="/contato" className="hover:text-brand-green">
              Contato
            </Link>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-green"
            >
              Instagram
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-green"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>

      <div className="bg-dark-2 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-6">
          <Link href="/" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG de marca, não precisa do otimizador de imagens */}
            <img
              src="/fhezo-industrial-logo-exact.svg"
              alt="Fhezo Industrial"
              className="h-10 w-auto"
            />
          </Link>

          <form action="/produtos" method="get" className="flex flex-1 items-stretch gap-2">
            <Input
              type="search"
              name="busca"
              placeholder="Buscar por SKU, produto ou categoria"
              aria-label="Buscar produtos"
              className="bg-white"
            />
            <Button type="submit" variant="primary" className="shrink-0">
              Buscar
            </Button>
          </form>

          <IndicadorCarrinho />
        </div>
      </div>

      <div className="bg-dark px-4">
        <div className="mx-auto max-w-6xl">
          <Nav />
        </div>
      </div>
    </header>
  );
}
