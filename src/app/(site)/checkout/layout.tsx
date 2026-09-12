import type { ReactNode } from "react";
import {
  MENSAGEM_CHECKOUT_FECHADO,
  checkoutHabilitado,
} from "@/lib/config/lancamento";
import { EstruturaCheckout } from "./estrutura-checkout";
import { CatalogoCheckout } from "./catalogo-checkout";
export default function LayoutCheckout({ children }: { children: ReactNode }) {
  // Só aviso (UX). Quem recusa o pedido de fato é criarPedido, no servidor.
  const fechado = !checkoutHabilitado();
  return (
    <CatalogoCheckout>
      <EstruturaCheckout>
        {fechado && (
          <p className="action-error" role="status">
            {MENSAGEM_CHECKOUT_FECHADO}
          </p>
        )}
        {children}
      </EstruturaCheckout>
    </CatalogoCheckout>
  );
}

// Permite aguardar a resposta do emissor sem encerrar prematuramente a função.
export const maxDuration = 120;
