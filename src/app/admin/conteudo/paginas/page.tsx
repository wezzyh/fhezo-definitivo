import Link from "next/link";
import { Button } from "@/components/ui/button";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { BotaoAlternarAtivoPagina } from "./botao-alternar-ativo";
import type { PaginaInstitucional } from "@/types/database";

export default async function AdminPaginasPage() {
  const supabase = await criarClienteSupabaseServidor();
  const { data: paginas, error } = await supabase
    .from("paginas_institucionais")
    .select("*")
    .order("titulo")
    .returns<PaginaInstitucional[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Páginas institucionais</h1>
        <Link href="/admin/conteudo/paginas/novo">
          <Button variant="primary">+ Nova página</Button>
        </Link>
      </div>
      <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
        Textos como &quot;Sobre nós&quot;, &quot;Política de privacidade&quot;, servidos em
        /institucional/&lt;slug&gt; e linkados automaticamente no rodapé do site quando ativos.
      </p>

      {error && <p className="mt-4 text-sm text-[var(--admin-danger)]">Erro ao carregar páginas: {error.message}</p>}
      {!error && (paginas ?? []).length === 0 && (
        <p className="mt-6 text-sm text-[var(--admin-text-secondary)]">Nenhuma página cadastrada ainda.</p>
      )}

      {(paginas ?? []).length > 0 && (
        <div className="mt-6 space-y-3">
          {(paginas ?? []).map((pagina) => (
            <div
              key={pagina.id}
              className="flex flex-wrap items-center gap-4 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3"
            >
              <div className="min-w-[10rem] flex-1">
                <p className="font-medium text-[var(--admin-text)]">{pagina.titulo}</p>
                <p className="text-xs text-[var(--admin-text-secondary)]">/institucional/{pagina.slug}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  pagina.ativo
                    ? "bg-[var(--admin-green)]/15 text-[var(--admin-green-text)]"
                    : "bg-[var(--admin-surface-hover)] text-[var(--admin-text-secondary)]"
                }`}
              >
                {pagina.ativo ? "Ativa" : "Inativa"}
              </span>
              <Link
                href={`/admin/conteudo/paginas/${pagina.id}/editar`}
                className="text-sm font-medium text-[var(--admin-green-text)] hover:underline"
              >
                Editar
              </Link>
              <BotaoAlternarAtivoPagina id={pagina.id} ativo={pagina.ativo} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
