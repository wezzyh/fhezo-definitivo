import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CarrinhoProvider } from "@/lib/carrinho/contexto";
import { CheckoutProvider } from "@/lib/checkout/contexto";

// Layout das páginas públicas do site (home, institucional, produtos):
// aplica o header e o footer institucionais em torno do conteúdo, e
// disponibiliza o estado de carrinho/checkout para toda essa área.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <CarrinhoProvider>
      <CheckoutProvider>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </CheckoutProvider>
    </CarrinhoProvider>
  );
}
