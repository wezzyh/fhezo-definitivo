import Link from "next/link";
import { Button } from "@/components/ui/button";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { BotaoAlternarAtivoMarca } from "./botao-alternar-ativo";
import type { Marca } from "@/types/database";

export default async function AdminMarcasPage() {
  const supabase = await criarClienteSupabaseServidor();
  const { data: marcas, error } = await supabase
    .from("marcas")
    .select("*")
    .order("nome")
    .returns<Marca[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Marcas</h1>
        <Link href="/admin/marcas/novo">
          <Button variant="primary">+ Nova marca</Button>
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-[var(--admin-danger)]">Erro ao carregar marcas: {error.message}</p>}

      {!error && (!marcas || marcas.length === 0) && (
        <p className="mt-6 text-sm text-[var(--admin-text-secondary)]">Nenhuma marca cadastrada ainda.</p>
      )}

      {marcas && marcas.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-hover)] text-xs uppercase text-[var(--admin-text-secondary)]">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {marcas.map((marca) => (
                <tr
                  key={marca.id}
                  className="border-b border-[var(--admin-border)] transition-colors duration-150 last:border-0 hover:bg-[var(--admin-surface-hover)]"
                >
                  <td className="px-4 py-3 font-medium text-[var(--admin-text)]">{marca.nome}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        marca.ativo
                          ? "bg-[var(--admin-green)]/15 text-[var(--admin-green-text)]"
                          : "bg-[var(--admin-surface-hover)] text-[var(--admin-text-secondary)]"
                      }`}
                    >
                      {marca.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/marcas/${marca.id}/editar`}
                        className="font-medium text-[var(--admin-green-text)] hover:underline"
                      >
                        Editar
                      </Link>
                      <BotaoAlternarAtivoMarca id={marca.id} ativo={marca.ativo} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
