import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { obterClienteLogado } from "@/lib/clientes/sessao";
import { TEXTO_STATUS_PEDIDO } from "@/lib/pedidos/status";
import { FormularioDados } from "./formulario-dados";
import { FormularioEndereco } from "./formulario-endereco";
import { sairCliente } from "./actions";
import { Button } from "@/components/ui/button";
import type { Pedido, PedidoItem, Produto } from "@/types/database";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface PedidoComItens extends Pedido {
  itens: (PedidoItem & { produto: Pick<Produto, "nome" | "sku"> | null })[];
}

export default async function PaginaConta() {
  const logado = await obterClienteLogado();
  if (!logado) redirect("/login?proximo=/conta");

  if (!logado.cliente) {
    // Sessão válida, mas sem vínculo em "clientes" ainda (raro — ex.: o
    // passo de vincular/criar no cadastro falhou). Não há dado pra editar
    // aqui; orienta a falar com o suporte em vez de mostrar uma tela quebrada.
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-5">
        <h1 className="text-2xl font-semibold text-ink">Minha conta</h1>
        <p className="mt-3 text-sm text-muted">
          Sua conta está autenticada, mas não encontramos um cadastro de cliente vinculado a ela. Fale com o suporte
          para resolver isso.
        </p>
      </main>
    );
  }

  const supabase = await criarClienteSupabaseServidor();

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("*")
    .eq("cliente_id", logado.cliente.id)
    .order("created_at", { ascending: false })
    .returns<Pedido[]>();

  const pedidosComItens: PedidoComItens[] = [];
  for (const pedido of pedidos ?? []) {
    const { data: itens } = await supabase
      .from("pedido_itens")
      .select("*, produto:produtos(nome, sku)")
      .eq("pedido_id", pedido.id)
      .returns<(PedidoItem & { produto: Pick<Produto, "nome" | "sku"> | null })[]>();
    pedidosComItens.push({ ...pedido, itens: itens ?? [] });
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Minha conta</h1>
        <form action={sairCliente}>
          <Button type="submit" variant="outline">
            Sair
          </Button>
        </form>
      </div>

      <section className="mt-8 rounded-md border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-ink">Dados cadastrais</h2>
        <div className="mt-4">
          <FormularioDados cliente={logado.cliente} />
        </div>
      </section>

      <section className="mt-6 rounded-md border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-ink">Endereço</h2>
        <p className="mt-1 text-sm text-muted">
          Usado para pré-preencher o endereço de entrega nas próximas compras.
        </p>
        <div className="mt-4">
          <FormularioEndereco cliente={logado.cliente} />
        </div>
      </section>

      <section id="pedidos" className="mt-6 scroll-mt-6 rounded-md border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-ink">Meus pedidos</h2>

        {pedidosComItens.length === 0 && (
          <p className="mt-3 text-sm text-muted">Você ainda não fez nenhum pedido.</p>
        )}

        <div className="mt-4 space-y-4">
          {pedidosComItens.map((pedido) => (
            <div key={pedido.id} className="rounded-md border border-zinc-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-ink">Pedido #{pedido.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted">{new Date(pedido.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-ink">
                  {TEXTO_STATUS_PEDIDO[pedido.status]}
                </span>
              </div>

              <ul className="mt-3 space-y-1 text-sm text-muted">
                {pedido.itens.map((item) => (
                  <li key={item.id}>
                    {item.quantidade}x {item.produto?.nome ?? "Produto removido"} —{" "}
                    {formatarMoeda(item.preco_unitario * item.quantidade)}
                  </li>
                ))}
              </ul>

              <p className="mt-2 text-sm font-semibold text-ink">Total: {formatarMoeda(pedido.total)}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
