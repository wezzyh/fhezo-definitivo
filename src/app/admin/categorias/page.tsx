import Link from "next/link";
import { Button } from "@/components/ui/button";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { ordenarCategoriasComHierarquia, rotuloComIndentacao } from "@/lib/categorias/hierarquia";
import { BotaoAlternarAtivoCategoria } from "./botao-alternar-ativo";
import { BotaoMoverCategoria } from "./botao-mover-categoria";
import type { Categoria } from "@/types/database";

export default async function AdminCategoriasPage() {
  const supabase = await criarClienteSupabaseServidor();
  const { data: categorias, error } = await supabase
    .from("categorias")
    .select("*")
    .returns<Categoria[]>();

  const categoriasOrdenadas = categorias ? ordenarCategoriasComHierarquia(categorias) : [];

  // Agrupar (preservando a ordem relativa já calculada acima) dá a posição
  // de cada categoria entre suas irmãs, sem precisar de outra consulta —
  // usado só pra habilitar/desabilitar ▲▼ no primeiro/último de cada nível.
  const irmasPorPai = new Map<string | null, string[]>();
  for (const categoria of categoriasOrdenadas) {
    const lista = irmasPorPai.get(categoria.categoria_pai_id);
    if (lista) lista.push(categoria.id);
    else irmasPorPai.set(categoria.categoria_pai_id, [categoria.id]);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Categorias</h1>
        <Link href="/admin/categorias/novo">
          <Button variant="primary">+ Nova categoria</Button>
        </Link>
      </div>

      {error && (
        <p className="mt-4 text-sm text-[var(--admin-danger)]">Erro ao carregar categorias: {error.message}</p>
      )}

      {!error && categoriasOrdenadas.length === 0 && (
        <p className="mt-6 text-sm text-[var(--admin-text-secondary)]">Nenhuma categoria cadastrada ainda.</p>
      )}

      {categoriasOrdenadas.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-hover)] text-xs uppercase text-[var(--admin-text-secondary)]">
              <tr>
                <th className="px-4 py-3 font-medium">Ordem</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categoriasOrdenadas.map((categoria) => {
                const irmas = irmasPorPai.get(categoria.categoria_pai_id) ?? [categoria.id];
                const posicao = irmas.indexOf(categoria.id);
                return (
                <tr
                  key={categoria.id}
                  className="border-b border-[var(--admin-border)] transition-colors duration-150 last:border-0 hover:bg-[var(--admin-surface-hover)]"
                >
                  <td className="px-4 py-3">
                    <BotaoMoverCategoria
                      id={categoria.id}
                      podeSubir={posicao > 0}
                      podeDescer={posicao < irmas.length - 1}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--admin-text)]">{rotuloComIndentacao(categoria)}</td>
                  <td className="px-4 py-3 text-[var(--admin-text-secondary)]">{categoria.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        categoria.ativo
                          ? "bg-[var(--admin-green)]/15 text-[var(--admin-green-text)]"
                          : "bg-[var(--admin-surface-hover)] text-[var(--admin-text-secondary)]"
                      }`}
                    >
                      {categoria.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/categorias/${categoria.id}/editar`}
                        className="font-medium text-[var(--admin-green-text)] hover:underline"
                      >
                        Editar
                      </Link>
                      <BotaoAlternarAtivoCategoria id={categoria.id} ativo={categoria.ativo} />
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
