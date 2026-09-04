// Placeholder de carregamento para as tabelas do admin (produtos, clientes,
// pedidos) — usado nos loading.tsx de cada rota (Next.js já envolve a
// página em Suspense automaticamente; nenhuma lógica de busca de dados
// muda). Só admin, por isso referencia os tokens --admin-* direto.

import type { HTMLAttributes } from "react";

export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`animate-pulse rounded-md bg-[var(--admin-surface-hover)] ${className}`} {...props} />;
}

interface SkeletonTabelaProps {
  linhas?: number;
  colunas: number;
}

/** Linhas de esqueleto para dentro de um <tbody>, imitando a forma real da tabela. */
export function SkeletonLinhasTabela({ linhas = 8, colunas }: SkeletonTabelaProps) {
  return (
    <>
      {Array.from({ length: linhas }).map((_, indiceLinha) => (
        <tr key={indiceLinha} className="border-b border-[var(--admin-border)] last:border-0">
          {Array.from({ length: colunas }).map((_, indiceColuna) => (
            <td key={indiceColuna} className="px-4 py-3">
              <Skeleton className="h-4" style={{ width: `${55 + ((indiceLinha * 7 + indiceColuna * 13) % 35)}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
