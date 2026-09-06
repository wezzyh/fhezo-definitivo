import { redirect } from "next/navigation";
import { obterClienteLogado } from "@/lib/clientes/sessao";
import { FormularioLogin } from "./formulario-login";

interface PaginaLoginProps {
  searchParams: Promise<{ proximo?: string }>;
}

export default async function PaginaLogin({ searchParams }: PaginaLoginProps) {
  const { proximo } = await searchParams;
  const logado = await obterClienteLogado();
  if (logado) redirect(proximo && proximo.startsWith("/") ? proximo : "/conta");

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-5">
      <h1 className="text-2xl font-semibold text-ink">Entrar</h1>
      <p className="mt-1 text-sm text-muted">Acesse sua conta para ver seus pedidos e dados salvos.</p>

      <div className="mt-6 rounded-md border border-zinc-200 bg-white p-6">
        <FormularioLogin proximo={proximo && proximo.startsWith("/") ? proximo : "/conta"} />
      </div>
    </main>
  );
}
