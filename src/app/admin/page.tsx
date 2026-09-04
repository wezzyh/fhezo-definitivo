// TODO: quando houver mais de um administrador, adicionar aqui (ou no
// proxy, em src/proxy.ts) uma checagem de "role"/permissão, além da
// simples autenticação — hoje existe um único usuário admin.

import Link from "next/link";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { buscarIntegracaoMelhorEnvio, obterTokenValidoMelhorEnvio } from "@/lib/integracoes/melhorenvio";
import { buscarIntegracaoBling, obterTokenValidoBling } from "@/lib/integracoes/bling";
import { BotaoReenviarPedidoBling } from "./integracao/bling/botao-reenviar-pedido";
import { Card } from "@/components/ui/card";
import { isoDiasAtras, isoDataMaisDias } from "@/lib/data/tempo";
import type { Pedido, Produto } from "@/types/database";

// Abaixo deste valor de estoque, o produto entra na seção "Estoque
// crítico" e conta no item "Estoque baixo" da Central de ações. Fácil de
// ajustar depois — idealmente viraria uma configuração por
// produto/categoria, mas por enquanto um único limite global já resolve.
const LIMITE_ESTOQUE_BAIXO = 10;

// Janela considerada "ainda relevante" pro item "Webhooks/retries
// pendentes" — sem isso a contagem só cresceria pra sempre (não existe
// hoje um jeito de marcar um evento como "resolvido").
const DIAS_EVENTOS_RECENTES = 7;

interface ItemCentralAcoes {
  titulo: string;
  contagem: number | null;
  textoPlaceholder?: string;
  href: string | null;
  descricao: string;
}

export default async function PaginaAdmin() {
  const supabase = await criarClienteSupabaseServidor();

  const desdeEventosRecentes = isoDiasAtras(DIAS_EVENTOS_RECENTES);
  const hojeIso = isoDataMaisDias(0);

  const [
    { data: produtos },
    { data: pedidosStatus },
    { count: totalClientes },
    integracaoMelhorEnvio,
    integracaoBling,
    { data: pedidosNaoSincronizados },
    { count: produtosSemImagem },
    { count: eventosFalhosRecentes },
    { count: clientesComAcaoAtrasada },
    { count: ticketsPendentes },
    tokenMelhorEnvioValido,
    tokenBlingValido,
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
    supabase
      .from("produtos")
      .select("id", { count: "exact", head: true })
      .eq("ativo", true)
      .is("imagem_url", null),
    supabase
      .from("eventos_integracao")
      .select("id", { count: "exact", head: true })
      .eq("sucesso", false)
      .gte("created_at", desdeEventosRecentes),
    supabase
      .from("clientes_crm")
      .select("cliente_id", { count: "exact", head: true })
      .lt("proxima_acao_data", hojeIso),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["aberto", "em_andamento"]),
    // Tenta de verdade renovar o token (mesmo mecanismo usado sempre que
    // o app faz uma chamada real ao Melhor Envio/Bling) em vez de só
    // comparar expira_em com agora: o access_token é de curta duração e
    // expira sozinho entre usos, sem que isso signifique problema nenhum
    // — o que importa pra saber se a integração está "com erro" de
    // verdade é se dá pra RENOVAR (refresh_token ainda válido), não se o
    // último access_token já venceu.
    obterTokenValidoMelhorEnvio(supabase),
    obterTokenValidoBling(supabase),
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
  const pedidosAguardandoPagamento = (pedidosStatus ?? []).filter((pedido) => pedido.status === "pendente").length;
  const pedidosParaSeparar = (pedidosStatus ?? []).filter((pedido) => pedido.status === "pago").length;
  const pagamentosFalhos = (pedidosStatus ?? []).filter((pedido) => pedido.status === "cancelado").length;

  const conectado = Boolean(integracaoMelhorEnvio?.access_token);
  // "Com erro" de verdade = não conseguimos um token utilizável AGORA
  // (renovação real tentada acima, via obterTokenValidoMelhorEnvio) — não
  // é o mesmo que o último access_token ter vencido, o que é normal e
  // se resolve sozinho via refresh_token a cada uso.
  const melhorEnvioComErro = conectado && !tokenMelhorEnvioValido;
  const conectadoBling = Boolean(integracaoBling?.access_token);
  const blingComErro = conectadoBling && !tokenBlingValido;

  const integracoesComErro = (!conectado || melhorEnvioComErro ? 1 : 0) + (!conectadoBling || blingComErro ? 1 : 0);

  const cartoesResumo: { titulo: string; valor: string }[] = [
    { titulo: "Pedidos aguardando pagamento", valor: String(pedidosAguardandoPagamento) },
    { titulo: "Produtos na loja", valor: String(produtosAtivos.length) },
    { titulo: "Estoque total", valor: estoqueTotal.toLocaleString("pt-BR") },
    { titulo: "Pedidos (total)", valor: String(totalPedidos) },
    { titulo: "Clientes", valor: String(totalClientes ?? 0) },
  ];

  const centralDeAcoes: ItemCentralAcoes[] = [
    {
      titulo: "Pedidos para separar",
      contagem: pedidosParaSeparar,
      href: "/admin/pedidos?status=pago",
      descricao: "Pagamento confirmado, aguardando separação/envio.",
    },
    {
      titulo: "Pagamentos falhos",
      contagem: pagamentosFalhos,
      href: "/admin/pedidos?status=cancelado",
      descricao: "Cobrança vencida, estornada ou cancelada (Asaas).",
    },
    {
      titulo: "Produtos sem imagem",
      contagem: produtosSemImagem ?? 0,
      href: "/admin/produtos?problema=sem_imagem",
      descricao: "Produtos ativos sem foto principal cadastrada.",
    },
    {
      titulo: "Estoque baixo",
      contagem: produtosEstoqueBaixo.length,
      href: "#estoque-critico",
      descricao: `Abaixo de ${LIMITE_ESTOQUE_BAIXO} unidades.`,
    },
    {
      titulo: "Integrações",
      contagem: integracoesComErro,
      href: "/admin/integracao",
      descricao: "Bling e/ou Melhor Envio desconectados ou com token vencido.",
    },
    {
      titulo: "Tickets pendentes",
      contagem: ticketsPendentes ?? 0,
      href: "/admin/tickets",
      descricao: "Tickets de suporte abertos ou em andamento.",
    },
    {
      titulo: "Clientes com ação atrasada",
      contagem: clientesComAcaoAtrasada ?? 0,
      href: "/admin/clientes?atrasada=1",
      descricao: "Próxima ação de venda com data já vencida.",
    },
    {
      titulo: "Pedidos não enviados ao Bling",
      contagem: pedidosNaoSincronizados?.length ?? 0,
      href: "#bling-nao-sincronizado",
      descricao: "Pagamento confirmado, falhou ao enviar para o Bling.",
    },
    {
      titulo: "Webhooks/retries pendentes",
      contagem: eventosFalhosRecentes ?? 0,
      href: "/admin/eventos",
      descricao: `Falhas de webhook (Asaas) ou sincronização (Bling) nos últimos ${DIAS_EVENTOS_RECENTES} dias.`,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Dashboard</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cartoesResumo.map((cartao) => (
          <Card key={cartao.titulo}>
            <p className="text-sm font-medium text-[var(--admin-text-secondary)]">{cartao.titulo}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--admin-text)]">{cartao.valor}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--admin-text)]">Central de ações</h2>
        <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
          O que precisa da sua atenção agora — cada item leva direto para resolver.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {centralDeAcoes.map((item) => {
            const conteudo = (
              <Card
                className={`h-full transition-colors duration-150 ${
                  item.href
                    ? "hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-surface-hover)]"
                    : "opacity-75"
                }`}
              >
                <p className="text-sm font-medium text-[var(--admin-text-secondary)]">{item.titulo}</p>
                <div className="mt-2">
                  {item.contagem === null ? (
                    <span className="text-sm font-medium text-[var(--admin-text-secondary)]">
                      {item.textoPlaceholder}
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xl font-semibold tabular-nums ${
                        item.contagem === 0
                          ? "bg-[var(--admin-green)]/15 text-[var(--admin-green-text)]"
                          : "bg-[var(--admin-warning)]/15 text-[var(--admin-warning)]"
                      }`}
                    >
                      {item.contagem}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-[var(--admin-text-secondary)]">{item.descricao}</p>
                {item.href && (
                  <span className="mt-2 inline-block text-xs font-medium text-[var(--admin-green-text)]">
                    Resolver →
                  </span>
                )}
              </Card>
            );

            return item.href ? (
              <Link key={item.titulo} href={item.href}>
                {conteudo}
              </Link>
            ) : (
              <div key={item.titulo}>{conteudo}</div>
            );
          })}
        </div>
      </div>

      <Card id="estoque-critico" className="mt-8 scroll-mt-20 p-6">
        <h2 className="text-lg font-semibold text-[var(--admin-text)]">Estoque crítico</h2>
        <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
          Produtos com estoque abaixo de {LIMITE_ESTOQUE_BAIXO} unidades, do mais crítico para o
          menos crítico.
        </p>

        {produtosEstoqueBaixo.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--admin-text-secondary)]">
            Nenhum produto abaixo do limite de estoque.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-[var(--admin-border)]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-hover)] text-xs uppercase text-[var(--admin-text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Estoque atual</th>
                </tr>
              </thead>
              <tbody>
                {produtosEstoqueBaixo.map((produto) => (
                  <tr
                    key={produto.id}
                    className="border-b border-[var(--admin-border)] transition-colors duration-150 last:border-0 hover:bg-[var(--admin-surface-hover)]"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--admin-text)]">{produto.nome}</td>
                    <td className="px-4 py-3 text-[var(--admin-text-secondary)]">{produto.sku}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[var(--admin-warning)]/15 px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--admin-warning)]">
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
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">Produtos do Bling aguardando revisão</h2>
            <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
              Importados automaticamente na sincronização de estoque — revise categoria, preço,
              peso/dimensões e fotos antes de ativar.
            </p>
          </div>
          {produtosPendentesRevisao.length > 0 && (
            <Link
              href="/admin/produtos?revisao=1"
              className="shrink-0 text-sm font-medium text-[var(--admin-green-text)] hover:underline"
            >
              Ver em Produtos →
            </Link>
          )}
        </div>

        {produtosPendentesRevisao.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--admin-text-secondary)]">
            Nenhum produto do Bling aguardando revisão.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-[var(--admin-border)] rounded-md border border-[var(--admin-border)]">
            {produtosPendentesRevisao.map((produto) => (
              <div key={produto.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium text-[var(--admin-text)]">{produto.nome}</p>
                  <p className="mt-1 text-xs text-[var(--admin-text-secondary)]">SKU {produto.sku}</p>
                </div>
                <Link
                  href={`/admin/produtos/${produto.id}/editar`}
                  className="shrink-0 text-sm font-medium text-[var(--admin-green-text)] hover:underline"
                >
                  Revisar
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card id="bling-nao-sincronizado" className="mt-8 scroll-mt-20 p-6">
        <h2 className="text-lg font-semibold text-[var(--admin-text)]">
          Pedidos pagos não sincronizados com o Bling
        </h2>
        <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
          O pagamento desses pedidos já foi confirmado — a falha foi só ao enviar para o Bling.
        </p>

        {(!pedidosNaoSincronizados || pedidosNaoSincronizados.length === 0) && (
          <p className="mt-4 text-sm text-[var(--admin-text-secondary)]">
            Nenhum pedido pago pendente de sincronização.
          </p>
        )}

        {pedidosNaoSincronizados && pedidosNaoSincronizados.length > 0 && (
          <div className="mt-4 divide-y divide-[var(--admin-border)] rounded-md border border-[var(--admin-border)]">
            {pedidosNaoSincronizados.map((pedido) => (
              <div key={pedido.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium text-[var(--admin-text)]">
                    Pedido #{pedido.id.replace(/-/g, "").slice(0, 8).toUpperCase()} —{" "}
                    {pedido.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                  <p className="mt-1 text-xs text-[var(--admin-text-secondary)]">
                    {new Date(pedido.created_at).toLocaleString("pt-BR")}
                  </p>
                  {pedido.bling_erro_sincronizacao && (
                    <p className="mt-1 text-xs text-[var(--admin-danger)]">{pedido.bling_erro_sincronizacao}</p>
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
