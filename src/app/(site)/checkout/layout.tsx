import type { ReactNode } from "react";
import { EstruturaCheckout } from "./estrutura-checkout";
import { CatalogoCheckout } from "./catalogo-checkout";
export default function LayoutCheckout({ children }: { children: ReactNode }) {
  return (
    <CatalogoCheckout>
      <EstruturaCheckout>{children}</EstruturaCheckout>
    </CatalogoCheckout>
  );
}

// Permite aguardar a resposta do emissor sem encerrar prematuramente a função.
export const maxDuration = 120;
