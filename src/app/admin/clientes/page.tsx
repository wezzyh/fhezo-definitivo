import Link from "next/link";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isoDataMaisDias, isoDiasAtras } from "@/lib/data/tempo";
import { SEGMENTOS_CLIENTE } from "@/lib/clientes/segmentos";
import { calcularUrgenciaProximaAcao, classesUrgenciaProximaAcao } from "@/lib/clientes/proxima-acao";
import type { ClienteCrmResumo } from "@/types/database";

const TAMANHO_PAGINA = 50;
const DIAS_SEM_COMPRA_PADRAO = 90;

interface AdminClientesPageProps {
  searchParams: Promise<{
    segmento?: string;
    semProximaAcao?: string;
    atrasada?: string;
    semCompra?: string;
    diasSemCompra?: string;
    pagina?: string;
  }>;
}

export default async function AdminClientesPage({ searchParams }: AdminClientesPageProps) {
  const {
    segmento: segmentoFiltro,
    semProximaAcao: semProximaAcaoBruto,
    atrasada: atrasadaBruto,
    semCompra: semCompraBruto,
    diasSemCompra: diasSemCompraBruto,
    pagina: paginaBruta,
  } = await searchParams;

  const semProximaAcao = semProximaAcaoBruto === "1";
  const somenteAtrasadas = atrasadaBruto === "1";
  const semCompra = semCompraBruto === "1";
  const diasSemCompra = Math.max(1, Number(diasSemCompraBruto) || DIAS_SEM_COMPRA_PADRAO);
  const paginaAtual = Math.max(1, Number(paginaBruta) || 1);

  const supabase = await criarClienteSupabaseServidor();

  const hojeIso = isoDataMaisDias(0);
  const amanhaIso = isoDataMaisDias(1);

  let query = supabase
    .from("clientes_crm_resumo")
    .select("*", { count: "exact" })
    .eq("tipo", "PJ");

  if (segmentoFiltro) query = query.eq("segmento", segmentoFiltro);
  if (semProximaAcao) query = query.is("proxima_acao_data", null);
  if (somenteAtrasadas) query = query.lt("proxima_acao_data", hojeIso);
  if (semCompra) {
    const corteIso = isoDiasAtras(diasSemCompra);
    query = query.or(`ultima_compra_em.is.null,ultima_compra_em.lt.${corteIso}`);
  }

  const de = (paginaAtual - 1) * TAMANHO_PAGINA;
  const ate = de + TAMANHO_PAGINA - 1;

  const {
    data: clientes,
    error,
    count: totalFiltrado,
  } = await query
    .order("nome", { ascending: true })
    .range(de, ate)
    .returns<ClienteCrmResumo[]>();

  const totalPaginas = Math.max(1, Math.ceil((totalFiltrado ?? 0) / TAMANHO_PAGINA));

  function construirHrefPagina(pagina: number): string {
    const params = new URLSearchParams();
    if (segmentoFiltro) params.set("segmento", segmentoFiltro);
    if (semProximaAcao) params.set("semProximaAcao", "1");
    if (somenteAtrasadas) params.set("atrasada", "1");
    if (semCompra) {
      params.set("semCompra", "1");
      params.set("diasSemCompra", String(diasSemCompra));
    }
    if (pagina > 1) params.set("pagina", String(pagina));
    const texto = params.toString();
    return `/admin/clientes${texto ? `?${texto}` : ""}`;
  }

  const algumFiltroAtivo = Boolean(segmentoFiltro) || semProximaAcao || somenteAtrasadas || semCompra;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Clientes (CRM)</h1>
        <Link href="/admin" className="text-sm font-medium text-[var(--admin-green-text)] hover:underline">
          Voltar ao dashboard
        </Link>
      </div>
      <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
        Empresas cadastradas (PJ), com contato principal, segmento, valor potencial e próxima ação
        de venda.
      </p>

      <Card className="mt-4 p-4">
        <form method="get" className="flex flex-wrap items-end gap-4">
          <div className="w-48">
            <label htmlFor="segmento" className="mb-1 block text-xs font-medium text-[var(--admin-text-secondary)]">
              Segmento
            </label>
            <Select id="segmento" name="segmento" defaultValue={segmentoFiltro ?? ""}>
              <option value="">Todos</option>
              {SEGMENTOS_CLIENTE.map((segmento) => (
                <option key={segmento} value={segmento}>
                  {segmento}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <input
              id="semProximaAcao"
              name="semProximaAcao"
              type="checkbox"
              value="1"
              defaultChecked={semProximaAcao}
              className="h-4 w-4 rounded border-[var(--admin-border-strong)]"
            />
            <label htmlFor="semProximaAcao" className="text-sm text-[var(--admin-text)]">
              Sem próxima ação definida
            </label>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <input
              id="atrasada"
              name="atrasada"
              type="checkbox"
              value="1"
              defaultChecked={somenteAtrasadas}
              className="h-4 w-4 rounded border-[var(--admin-border-strong)]"
            />
            <label htmlFor="atrasada" className="text-sm text-[var(--admin-text)]">
              Ação atrasada
            </label>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex items-center gap-2 pb-2">
              <input
                id="semCompra"
                name="semCompra"
                type="checkbox"
                value="1"
                defaultChecked={semCompra}
                className="h-4 w-4 rounded border-[var(--admin-border-strong)]"
              />
              <label htmlFor="semCompra" className="text-sm text-[var(--admin-text)]">
                Sem compra há mais de
              </label>
            </div>
            <div className="w-20">
              <Input
                type="number"
                name="diasSemCompra"
                min={1}
                defaultValue={diasSemCompra}
                aria-label="Dias sem compra"
              />
            </div>
            <span className="pb-2 text-sm text-[var(--admin-text-secondary)]">dias</span>
          </div>

          <Button type="submit" variant="primary">
            Aplicar filtros
          </Button>
          {algumFiltroAtivo && (
            <Link href="/admin/clientes" className="pb-2 text-sm font-medium text-[var(--admin-text-secondary)] underline hover:text-[var(--admin-text)]">
              Limpar filtros
            </Link>
          )}
        </form>
      </Card>

      {error && <p className="mt-4 text-sm text-[var(--admin-danger)]">Erro ao carregar clientes: {error.message}</p>}

      {!error && (!clientes || clientes.length === 0) && (
        <p className="mt-6 text-sm text-[var(--admin-text-secondary)]">Nenhum cliente encontrado com esses filtros.</p>
      )}

      {clientes && clientes.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-hover)] text-xs uppercase text-[var(--admin-text-secondary)]">
              <tr>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Comprador</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Segmento</th>
                <th className="px-4 py-3 font-medium">Última compra</th>
                <th className="px-4 py-3 font-medium">Valor potencial</th>
                <th className="px-4 py-3 font-medium">Próxima ação</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => {
                const urgencia = calcularUrgenciaProximaAcao(cliente.proxima_acao_data, hojeIso, amanhaIso);
                return (
                  <tr
                    key={cliente.cliente_id}
                    className="border-b border-[var(--admin-border)] transition-colors duration-150 last:border-0 hover:bg-[var(--admin-surface-hover)]"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--admin-text)]">
                      <Link href={`/admin/clientes/${cliente.cliente_id}`} className="hover:text-[var(--admin-green-text)] hover:underline">
                        {cliente.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text-secondary)]">{cliente.nome_comprador ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--admin-text-secondary)]">{cliente.telefone ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--admin-text-secondary)]">{cliente.email}</td>
                    <td className="px-4 py-3 text-[var(--admin-text-secondary)]">{cliente.segmento ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--admin-text-secondary)]">
                      {cliente.ultima_compra_em
                        ? new Date(cliente.ultima_compra_em).toLocaleDateString("pt-BR")
                        : "Nunca comprou"}
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text-secondary)]">
                      {cliente.valor_potencial != null
                        ? cliente.valor_potencial.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {cliente.proxima_acao || cliente.proxima_acao_data ? (
                        <span
                          className={`inline-flex flex-col rounded-md px-2 py-1 text-xs font-medium ${classesUrgenciaProximaAcao(urgencia)}`}
                        >
                          {cliente.proxima_acao && <span>{cliente.proxima_acao}</span>}
                          {cliente.proxima_acao_data && (
                            <span>{new Date(`${cliente.proxima_acao_data}T00:00:00`).toLocaleDateString("pt-BR")}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--admin-text-secondary)]">Nenhuma definida</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {clientes && clientes.length > 0 && totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--admin-text-secondary)]">
          <span>
            Página {paginaAtual} de {totalPaginas} ({totalFiltrado} cliente(s))
          </span>
          <div className="flex gap-3">
            {paginaAtual > 1 && (
              <Link href={construirHrefPagina(paginaAtual - 1)} className="font-medium text-[var(--admin-green-text)] hover:underline">
                ← Anterior
              </Link>
            )}
            {paginaAtual < totalPaginas && (
              <Link href={construirHrefPagina(paginaAtual + 1)} className="font-medium text-[var(--admin-green-text)] hover:underline">
                Próxima →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
