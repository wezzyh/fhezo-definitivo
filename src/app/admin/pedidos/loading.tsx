import { Skeleton, SkeletonLinhasTabela } from "@/components/ui/skeleton";

export default function CarregandoPedidos() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-5 w-36" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-hover)]">
            <tr>
              {Array.from({ length: 6 }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SkeletonLinhasTabela colunas={6} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
