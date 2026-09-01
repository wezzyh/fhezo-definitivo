import Link from "next/link";

const linksDoMenu = [
  { href: "/", rotulo: "Início" },
  { href: "/produtos", rotulo: "Produtos" },
  { href: "/institucional", rotulo: "Institucional" },
  { href: "/contato", rotulo: "Contato" },
];

export function Nav() {
  return (
    <nav className="flex items-center gap-6 text-sm font-medium">
      {linksDoMenu.map((link) => (
        <Link key={link.href} href={link.href} className="text-zinc-700 hover:text-blue-900">
          {link.rotulo}
        </Link>
      ))}
    </nav>
  );
}
