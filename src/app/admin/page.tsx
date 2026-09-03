// TODO: quando houver mais de um administrador, adicionar aqui (ou no
// proxy, em src/proxy.ts) uma checagem de "role"/permissão, além da
// simples autenticação — hoje existe um único usuário admin.

import Link from "next/link";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { buscarIntegracaoMelhorEnvio, montarUrlAutorizacaoMelhorEnvio } from "@/lib/integracoes/melhorenvio";
import { buscarIntegracaoBling, montarUrlAutorizacaoBling } from "@/lib/integracoes/bling";
import { BotaoSincronizarEstoqueBling } from "./integracao/bling/botao-sincronizar-estoque";
import { BotaoReenviarPedidoBling } from "./integracao/bling/botao-reenviar-pedido";
import { Card } from "@/components/ui/card";
import type { Pedido, Produto } from "@/types/database";

// Abaixo deste valor de estoque, o produto entra na seção "Estoque
// crítico" e conta no card "Estoque baixo". Fácil de ajustar depois —
// idealmente viraria uma configuração por produto/categoria, mas por
// enquanto um único limite global já resolve.
const LIMITE_ESTOQUE_BAIXO = 10;

interface PaginaAdminProps {
  searchParams: Promise<{
    integracao?: string;
    integracaoBling?: string;
    mensagem?: string;
  }>;
}

export default async function PaginaAdmin({ searchParams }: PaginaAdminProps) {
  const {
    integracao: statusIntegracao,
    integracaoBling: statusIntegracaoBling,
    mensagem: mensagemIntegracao,
  } = await searchParams;

  const supabase = await criarClienteSupabaseServidor();

  const [
    { data: produtos },
    { data: pedidosStatus },
    { count: totalClientes },
    integracaoMelhorEnvio,
    integracaoBling,
    { data: pedidosNaoSincronizados },
  ] = await Promise.all([
    supabase
      .from("produtos")
      .select("id, sku, nome, estoque, ativo, bling_produto_id")
      .returns<Pick<Produto, "id" | "sku" | "nome" | "estoque" | "ativo" | "bling_produto_id">[]>(),
    supabase.from("pedidos").select("id, status").returns<Pick<Pedido, "id" | "status">[]>(),
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    buscarIntegracaoMelhorEnvio(supabase),
    buscarIntegracaoBling(supabase),
    supabase
      .from("pedidos")
      .select("id, total, created_at, bling_erro_sincronizacao")
      .eq("status", "pago")
      .eq("bling_sincronizado", false)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<Pick<Pedido, "id" | "total" | "created_at" | "bling_erro_sincronizacao">[]>(),
  ]);

  const produtosAtivos = (produtos ?? []).filter((produto) => produto.ativo);
  const estoqueTotal = produtosAtivos.reduce((soma, produto) => soma + produto.estoque, 0);
  const produtosEstoqueBaixo = produtosAtivos
    .filter((produto) => produto.estoque < LIMITE_ESTOQUE_BAIXO)
    .sort((a, b) => a.estoque - b.estoque);
  const produtosPendentesRevisao = (produtos ?? []).filter(
    (produto) => produto.bling_produto_id !== null && !produto.ativo,
  );

  const totalPedidos = (pedidosStatus ?? []).length;
  const pedidosAguardandoPagamento = (pedidosStatus ?? []).filter(
    (pedido) => pedido.status === "pendente",
  ).length;

  const conectado = Boolean(integracaoMelhorEnvio?.access_token);
  const expiraEm = integracaoMelhorEnvio?.expira_em
    ? new Date(integracaoMelhorEnvio.expira_em).toLocaleString("pt-BR")
    : null;

  let urlAutorizacao: string | null = null;
  let erroConfiguracao: string | null = null;
  try {
    urlAutorizacao = montarUrlAutorizacaoMelhorEnvio();
  } catch (erro) {
    erroConfiguracao =
      erro instanceof Error ? erro.message : "Integração com o Melhor Envio não configurada.";
  }

  const conectadoBling = Boolean(integracaoBling?.access_token);
  const expiraEmBling = integracaoBling?.expira_em
    ? new Date(integracaoBling.expira_em).toLocaleString("pt-BR")
    : null;
  const ultimaSincronizacaoBling = integracaoBling?.ultima_sincronizacao
    ? new Date(integracaoBling.ultima_sincronizacao).toLocaleString("pt-BR")
    : null;

  let urlAutorizacaoBling: string | null = null;
  let erroConfiguracaoBling: string | null = null;
  try {
    urlAutorizacaoBling = montarUrlAutorizacaoBling();
  } catch (erro) {
    erroConfiguracaoBling = erro instanceof Error ? erro.message : "Integração com o Bling não configurada.";
  }

  const cartoesResumo: { titulo: string; valor: string; detalhe?: string }[] = [
    { titulo: "Pedidos aguardando ação financeira", valor: String(pedidosAguardandoPagamento) },
    { titulo: "Estoque baixo", valor: String(produtosEstoqueBaixo.length) },
    {
      titulo: "Bling",
      valor: conectadoBling ? "Conectado" : "Não conectado",
      detalhe: conectadoBling
        ? ultimaSincronizacaoBling
          ? `Última sincronização: ${ultimaSincronizacaoBling}`
          : "Ainda sem sincronização de estoque"
        : undefined,
    },
    { titulo: "Melhor Envio", valor: conectado ? "Conectado" : "Não conectado" },
    { titulo: "Produtos na loja", valor: String(produtosAtivos.length) },
    { titulo: "Estoque total", valor: estoqueTotal.toLocaleString("pt-BR") },
    { titulo: "Pedidos", valor: String(totalPedidos) },
    { titulo: "Clientes", valor: String(totalClientes ?? 0) },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Dashboard</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cartoesResumo.map((cartao) => (
          <Card key={cartao.titulo}>
            <p className="text-sm font-medium text-muted">{cartao.titulo}</p>
            <p
              className={`mt-2 text-2xl font-medium ${
                (cartao.titulo === "Bling" && !conectadoBling) ||
                (cartao.titulo === "Melhor Envio" && !conectado)
                  ? "text-muted"
                  : "text-ink"
              }`}
            >
              {cartao.valor}
            </p>
            {cartao.detalhe && <p className="mt-1 text-xs text-muted">{cartao.detalhe}</p>}
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-6">
        <h2 className="text-lg font-semibold text-ink">Estoque crítico</h2>
        <p className="mt-1 text-sm text-muted">
          Produtos com estoque abaixo de {LIMITE_ESTOQUE_BAIXO} unidades, do mais crítico para o
          menos crítico.
        </p>

        {produtosEstoqueBaixo.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nenhum produto abaixo do limite de estoque. 🎉</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Estoque atual</th>
                </tr>
              </thead>
              <tbody>
                {produtosEstoqueBaixo.map((produto) => (
                  <tr key={produto.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{produto.nome}</td>
                    <td className="px-4 py-3 text-muted">{produto.sku}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-dark-2">
                        {produto.estoque}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-8 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Produtos do Bling aguardando revisão</h2>
            <p className="mt-1 text-sm text-muted">
              Importados automaticamente na sincronização de estoque — revise categoria, preço,
              peso/dimensões e fotos antes de ativar.
            </p>
          </div>
          {produtosPendentesRevisao.length > 0 && (
            <Link
              href="/admin/produtos?revisao=1"
              className="shrink-0 text-sm font-medium text-brand-green hover:underline"
            >
              Ver em Produtos →
            </Link>
          )}
        </div>

        {produtosPendentesRevisao.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nenhum produto do Bling aguardando revisão.</p>
        ) : (
          <div className="mt-4 divide-y divide-zinc-200 rounded-md border border-zinc-200">
            {produtosPendentesRevisao.map((produto) => (
              <div key={produto.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium text-ink">{produto.nome}</p>
                  <p className="mt-1 text-xs text-muted">SKU {produto.sku}</p>
                </div>
                <Link
                  href={`/admin/produtos/${produto.id}/editar`}
                  className="shrink-0 text-sm font-medium text-brand-green hover:underline"
                >
                  Revisar
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-8 p-6">
        <h2 className="text-lg font-semibold text-ink">Integrações</h2>

        {statusIntegracao === "sucesso" && (
          <p className="mt-3 rounded-md bg-brand-green/10 px-3 py-2 text-sm text-brand-green-dark">
            {mensagemIntegracao ?? "Integração conectada com sucesso."}
          </p>
        )}
        {statusIntegracao === "erro" && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {mensagemIntegracao ?? "Não foi possível concluir a integração."}
          </p>
        )}
        {statusIntegracaoBling === "sucesso" && (
          <p className="mt-3 rounded-md bg-brand-green/10 px-3 py-2 text-sm text-brand-green-dark">
            {mensagemIntegracao ?? "Integração conectada com sucesso."}
          </p>
        )}
        {statusIntegracaoBling === "erro" && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {mensagemIntegracao ?? "Não foi possível concluir a integração."}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-4 rounded-md border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-ink">Melhor Envio</p>
            <p className="mt-1 text-sm text-muted">
              {conectado
                ? `Conectado. Token válido até ${expiraEm ?? "data desconhecida"}.`
                : "Não conectado. Conecte para habilitar o cálculo de frete no checkout."}
            </p>
          </div>

          {urlAutorizacao ? (
            <a
              href={urlAutorizacao}
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-dark"
            >
              {conectado ? "Reconectar com Melhor Envio" : "Conectar com Melhor Envio"}
            </a>
          ) : (
            <p className="text-sm text-red-600">{erroConfiguracao}</p>
          )}
        </div>

        <div className="mt-4 rounded-md border border-zinc-200 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Bling (ERP)</p>
              <p className="mt-1 text-sm text-muted">
                {conectadoBling
                  ? `Conectado. Token válido até ${expiraEmBling ?? "data desconhecida"}.`
                  : "Não conectado. Conecte para sincronizar estoque e enviar pedidos pagos."}
              </p>
              {conectadoBling && (
                <p className="mt-1 text-xs text-muted">
                  {ultimaSincronizacaoBling
                    ? `Última sincronização de estoque: ${ultimaSincronizacaoBling}`
                    : "Ainda sem sincronização de estoque."}
                </p>
              )}
            </div>

            {urlAutorizacaoBling ? (
              <a
                href={urlAutorizacaoBling}
                className="inline-flex shrink-0 items-center justify-center rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-dark"
              >
                {conectadoBling ? "Reconectar com Bling" : "Conectar com Bling"}
              </a>
            ) : (
              <p className="text-sm text-red-600">{erroConfiguracaoBling}</p>
            )}
          </div>

          {conectadoBling && (
            <div className="mt-4 border-t border-zinc-200 pt-4">
              <BotaoSincronizarEstoqueBling />
            </div>
          )}
        </div>
      </Card>

      <Card className="mt-8 p-6">
        <h2 className="text-lg font-semibold text-ink">Pedidos pagos não sincronizados com o Bling</h2>
        <p className="mt-1 text-sm text-muted">
          O pagamento desses pedidos já foi confirmado — a falha foi só ao enviar para o Bling.
        </p>

        {(!pedidosNaoSincronizados || pedidosNaoSincronizados.length === 0) && (
          <p className="mt-4 text-sm text-muted">Nenhum pedido pago pendente de sincronização. 🎉</p>
        )}

        {pedidosNaoSincronizados && pedidosNaoSincronizados.length > 0 && (
          <div className="mt-4 divide-y divide-zinc-200 rounded-md border border-zinc-200">
            {pedidosNaoSincronizados.map((pedido) => (
              <div key={pedido.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium text-ink">
                    Pedido #{pedido.id.replace(/-/g, "").slice(0, 8).toUpperCase()} —{" "}
                    {pedido.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(pedido.created_at).toLocaleString("pt-BR")}
                  </p>
                  {pedido.bling_erro_sincronizacao && (
                    <p className="mt-1 text-xs text-red-600">{pedido.bling_erro_sincronizacao}</p>
                  )}
                </div>
                <BotaoReenviarPedidoBling pedidoId={pedido.id} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
