"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";
import { useCheckout } from "@/lib/checkout/contexto";
import styles from "./checkout.module.css";
const etapas = [
  { nome: "Carrinho", href: "/checkout", titulo: "Carrinho de compras" },
  {
    nome: "Identificação",
    href: "/checkout/identificacao",
    titulo: "Identificação",
  },
  { nome: "Pagamento", href: "/checkout/pagamento", titulo: "Pagamento" },
];
export function EstruturaCheckout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { confirmado } = useCheckout();
  const confirmacao = pathname.includes("/confirmacao");
  const atual = pathname.includes("/identificacao")
    ? 1
    : pathname.includes("/pagamento") || confirmacao
      ? 2
      : 0;
  return (
    <div className={styles.checkout}>
      <header className="site-header">
        <div className="page-container header-content">
          <Link
            href="/"
            className="brand"
            aria-label="FHEZO Industrial, página inicial"
          >
            <span className="brand-name">
              FHEZO<span className="brand-period">.</span>
            </span>
            <span className="brand-description">INDUSTRIAL</span>
          </Link>
          <span className="header-caption">Peças e soluções industriais</span>
          <div className="checkout-label">
            <LockKeyhole size={15} strokeWidth={1.5} /> Checkout
          </div>
        </div>
      </header>
      <main className="page-container main-content">
        <nav className="checkout-progress" aria-label="Etapas do pedido">
          <ol>
            {etapas.map((etapa, i) => (
              <li
                key={etapa.href}
                aria-current={i === atual ? "step" : undefined}
              >
                {!confirmacao &&
                (i < atual || (i === 2 && confirmado && atual === 1)) ? (
                  <Link href={etapa.href}>
                    <span>{"0" + (i + 1)}</span> {etapa.nome}
                  </Link>
                ) : (
                  <>
                    <span>{"0" + (i + 1)}</span> {etapa.nome}
                  </>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <div className="page-heading">
          <p className="eyebrow">SEU PEDIDO</p>
          <h1>{confirmacao ? "Acompanhar pedido" : etapas[atual].titulo}</h1>
        </div>
        {children}
      </main>
      <footer className="page-container site-footer">
        <span>FHEZO Industrial</span>
        <span>Peças para manter sua operação em movimento.</span>
      </footer>
    </div>
  );
}
