import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { EstruturaSite } from "@/components/layout/estrutura-site";
import { CarrinhoProvider } from "@/lib/carrinho/contexto";
import { CheckoutProvider } from "@/lib/checkout/contexto";
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <CarrinhoProvider>
      <CheckoutProvider>
        <EstruturaSite header={<Header />} footer={<Footer />}>
          {children}
        </EstruturaSite>
      </CheckoutProvider>
    </CarrinhoProvider>
  );
}
