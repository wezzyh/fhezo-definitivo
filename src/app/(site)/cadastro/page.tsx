import { redirect } from "next/navigation";
import { obterClienteLogado } from "@/lib/clientes/sessao";
import { destinoInterno } from "@/lib/url-interna";
import { AssistenteCadastro } from "./assistente-cadastro";

interface PaginaCadastroProps {
  searchParams: Promise<{ proximo?: string }>;
}

export default async function PaginaCadastro({ searchParams }: PaginaCadastroProps) {
  const { proximo } = await searchParams;
  const destino = destinoInterno(proximo);
  const logado = await obterClienteLogado();
  if (logado) redirect(destino);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-5 sm:py-16">
      <h1 className="text-2xl font-semibold text-ink">Criar conta</h1>
      <p className="mt-1 text-sm text-muted">
        Acompanhe seus pedidos e agilize suas próximas compras.
      </p>

      <div className="mt-6 rounded-md border border-zinc-200 bg-white p-4 sm:p-6">
        <AssistenteCadastro proximo={destino} />
      </div>
    </main>
  );
}
