import type { ReactNode } from "react";

// Mesmo padrão de src/app/admin/produtos/layout.tsx — ver ADMIN_REDESIGN.md.
// Só a criação de ticket vira modal aqui (não a página de detalhe/resposta,
// que já é uma tela própria com conversa + troca de status).
export default function TicketsLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
