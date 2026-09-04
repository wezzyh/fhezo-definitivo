import { Skeleton, SkeletonLinhasTabela } from "@/components/ui/skeleton";

// Next.js envolve page.tsx num Suspense automaticamente por causa deste
// arquivo — nenhuma mudança na busca de dados da página real. Imita a
// forma da tabela (mesmas 10 colunas) pra não "pular" o layout quando os
// dados chegam.
export default function CarregandoProdutos() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-28 rounded-full" />
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-hover)]">
            <tr>
              {Array.from({ length: 10 }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SkeletonLinhasTabela colunas={10} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
