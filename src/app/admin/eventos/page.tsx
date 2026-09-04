import Link from "next/link";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";

const LIMITE_EVENTOS = 200;

interface EventoIntegracao {
  id: string;
  provedor: string;
  evento: string;
  sucesso: boolean;
  mensagem_erro: string | null;
  created_at: string;
}

interface AdminEventosPageProps {
  searchParams: Promise<{ todos?: string }>;
}

export default async function AdminEventosPage({ searchParams }: AdminEventosPageProps) {
  const { todos } = await searchParams;
  const mostrarTodos = todos === "1";

  const supabase = await criarClienteSupabaseServidor();

  let query = supabase
    .from("eventos_integracao")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(LIMITE_EVENTOS);

  if (!mostrarTodos) query = query.eq("sucesso", false);

  const { data: eventos, error } = await query.returns<EventoIntegracao[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Eventos de integração</h1>
        <Link href="/admin" className="text-sm font-medium text-[var(--admin-green-text)] hover:underline">
          Voltar ao dashboard
        </Link>
      </div>
      <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
        Falhas de webhook do Asaas e de sincronização de estoque com o Bling — as duas únicas fontes de
        falha que ainda não tinham nenhum registro consultável.
      </p>

      <div className="mt-4 flex gap-2">
        <Link
          href="/admin/eventos"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            !mostrarTodos
              ? "border-[var(--admin-green)] bg-[var(--admin-green)]/15 text-[var(--admin-green-text)]"
              : "border-[var(--admin-border-strong)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-green)] hover:text-[var(--admin-text)]"
          }`}
        >
          Só falhas
        </Link>
        <Link
          href="/admin/eventos?todos=1"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            mostrarTodos
              ? "border-[var(--admin-green)] bg-[var(--admin-green)]/15 text-[var(--admin-green-text)]"
              : "border-[var(--admin-border-strong)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-green)] hover:text-[var(--admin-text)]"
          }`}
        >
          Todos os eventos
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-[var(--admin-danger)]">Erro ao carregar eventos: {error.message}</p>}

      {!error && (!eventos || eventos.length === 0) && (
        <p className="mt-6 text-sm text-[var(--admin-text-secondary)]">
          {mostrarTodos ? "Nenhum evento registrado ainda." : "Nenhuma falha registrada. 🎉"}
        </p>
      )}

      {eventos && eventos.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-hover)] text-xs uppercase text-[var(--admin-text-secondary)]">
              <tr>
                <th className="px-4 py-3 font-medium">Quando</th>
                <th className="px-4 py-3 font-medium">Provedor</th>
                <th className="px-4 py-3 font-medium">Evento</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((evento) => (
                <tr
                  key={evento.id}
                  className="border-b border-[var(--admin-border)] transition-colors duration-150 last:border-0 hover:bg-[var(--admin-surface-hover)]"
                >
                  <td className="px-4 py-3 text-[var(--admin-text-secondary)]">
                    {new Date(evento.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--admin-text)]">{evento.provedor}</td>
                  <td className="px-4 py-3 text-[var(--admin-text)]">{evento.evento}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        evento.sucesso
                          ? "bg-[var(--admin-green)]/15 text-[var(--admin-green-text)]"
                          : "bg-[var(--admin-danger)]/15 text-[var(--admin-danger)]"
                      }`}
                    >
                      {evento.sucesso ? "Sucesso" : "Falha"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--admin-danger)]">{evento.mensagem_erro ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
