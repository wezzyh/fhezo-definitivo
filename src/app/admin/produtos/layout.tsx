import type { ReactNode } from "react";

// Declara o slot paralelo "@modal" (ver ADMIN_REDESIGN.md) usado pelas
// rotas interceptadas @modal/(.)novo e @modal/(.)[id]/editar, que mostram
// os formulários de criar/editar produto como modal em vez de página
// cheia. Navegação direta/refresh continua caindo nas páginas reais
// (novo/page.tsx, [id]/editar/page.tsx) — nada nelas mudou de
// comportamento, só de estilo.
export default function ProdutosLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
