import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonLinhasTabela } from "@/components/ui/skeleton";

export default function CarregandoClientes() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="mt-2 h-4 w-96" />

      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <Skeleton className="h-14 w-48" />
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-10 w-32" />
        </div>
      </Card>

      <div className="mt-6 overflow-hidden rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-hover)]">
            <tr>
              {Array.from({ length: 8 }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SkeletonLinhasTabela colunas={8} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
