"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CarrinhoDrawer } from "./carrinho-drawer";
import { ToastCarrinho } from "./toast-carrinho";
export function EstruturaSite({
  children,
  header,
  footer,
}: {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/checkout" || pathname.startsWith("/checkout/"))
    return children;
  return (
    <>
      {header}
      <main className="flex-1">{children}</main>
      {footer}
      <CarrinhoDrawer />
      <ToastCarrinho />
    </>
  );
}
