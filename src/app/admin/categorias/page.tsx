import Link from "next/link";
import { Button } from "@/components/ui/button";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { ordenarCategoriasComHierarquia, rotuloComIndentacao } from "@/lib/categorias/hierarquia";
import { BotaoAlternarAtivoCategoria } from "./botao-alternar-ativo";
import type { Categoria } from "@/types/database";

export default async function AdminCategoriasPage() {
  const supabase = await criarClienteSupabaseServidor();
  const { data: categorias, error } = await supabase
    .from("categorias")
    .select("*")
    .returns<Categoria[]>();

  const categoriasOrdenadas = categorias ? ordenarCategoriasComHierarquia(categorias) : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Categorias</h1>
        <Link href="/admin/categorias/novo">
          <Button variant="primary">+ Nova categoria</Button>
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">Erro ao carregar categorias: {error.message}</p>}

      {!error && categoriasOrdenadas.length === 0 && (
        <p className="mt-6 text-sm text-muted">Nenhuma categoria cadastrada ainda.</p>
      )}

      {categoriasOrdenadas.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-md border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categoriasOrdenadas.map((categoria) => (
                <tr key={categoria.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{rotuloComIndentacao(categoria)}</td>
                  <td className="px-4 py-3 text-muted">{categoria.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        categoria.ativo
                          ? "bg-brand-green/10 text-brand-green-dark"
                          : "bg-zinc-200 text-muted"
                      }`}
                    >
                      {categoria.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/categorias/${categoria.id}/editar`}
                        className="font-medium text-brand-green hover:underline"
                      >
                        Editar
                      </Link>
                      <BotaoAlternarAtivoCategoria id={categoria.id} ativo={categoria.ativo} />
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
