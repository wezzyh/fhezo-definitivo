import { redirect } from "next/navigation";
import { obterClienteLogado } from "@/lib/clientes/sessao";
import { FormularioCadastro } from "./formulario-cadastro";

interface PaginaCadastroProps {
  searchParams: Promise<{ proximo?: string }>;
}

export default async function PaginaCadastro({ searchParams }: PaginaCadastroProps) {
  const { proximo } = await searchParams;
  const logado = await obterClienteLogado();
  if (logado) redirect(proximo && proximo.startsWith("/") ? proximo : "/conta");

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-5">
      <h1 className="text-2xl font-semibold text-ink">Criar conta</h1>
      <p className="mt-1 text-sm text-muted">
        Acompanhe seus pedidos e agilize suas próximas compras. Não é obrigatório ter conta para comprar.
      </p>

      <div className="mt-6 rounded-md border border-zinc-200 bg-white p-6">
        <FormularioCadastro proximo={proximo && proximo.startsWith("/") ? proximo : "/conta"} />
      </div>
    </main>
  );
}
