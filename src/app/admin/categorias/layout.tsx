import type { ReactNode } from "react";

// Mesmo padrão de src/app/admin/produtos/layout.tsx — ver ADMIN_REDESIGN.md.
export default function CategoriasLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
