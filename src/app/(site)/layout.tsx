import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CarrinhoDrawer } from "@/components/layout/carrinho-drawer";
import { ToastCarrinho } from "@/components/layout/toast-carrinho";
import { CarrinhoProvider } from "@/lib/carrinho/contexto";
import { CheckoutProvider } from "@/lib/checkout/contexto";

// Layout das páginas públicas do site (home, institucional, produtos):
// aplica o header e o footer institucionais em torno do conteúdo, e
// disponibiliza o estado de carrinho/checkout para toda essa área.
// CarrinhoDrawer fica montado aqui (fora de <main>) porque é um overlay
// global do carrinho, não conteúdo de página — inclusive aparece sobre o
// checkout, já que ambos compartilham este layout.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <CarrinhoProvider>
      <CheckoutProvider>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CarrinhoDrawer />
        <ToastCarrinho />
      </CheckoutProvider>
    </CarrinhoProvider>
  );
}
