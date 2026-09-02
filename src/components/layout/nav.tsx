import Link from "next/link";

const categorias = [
  { rotulo: "Todos os produtos", href: "/produtos" },
  { rotulo: "Rolamentos", href: "/produtos" },
  { rotulo: "Engrenagens", href: "/produtos" },
  { rotulo: "Correntes", href: "/produtos" },
  { rotulo: "Graxas e Lubrificantes", href: "/produtos" },
  { rotulo: "Ferramentas", href: "/produtos" },
  { rotulo: "Parafusos e Porcas", href: "/produtos" },
];

// TODO: quando a listagem suportar filtro por categoria, trocar o href de
// cada item para "/produtos?categoria=<slug>".
export function Nav() {
  return (
    <nav className="flex items-center gap-6 overflow-x-auto text-sm font-medium text-zinc-300">
      {categorias.map((categoria) => (
        <Link
          key={categoria.rotulo}
          href={categoria.href}
          className="whitespace-nowrap py-3 hover:text-brand-green"
        >
          {categoria.rotulo}
        </Link>
      ))}
    </nav>
  );
}
