import { redirect } from "next/navigation";
import { obterClienteLogado } from "@/lib/clientes/sessao";
import { FormularioLogin } from "./formulario-login";

interface PaginaLoginProps {
  searchParams: Promise<{ proximo?: string; erro?: string }>;
}

export default async function PaginaLogin({ searchParams }: PaginaLoginProps) {
  const { proximo, erro } = await searchParams;
  const logado = await obterClienteLogado();
  if (logado) redirect(proximo && proximo.startsWith("/") ? proximo : "/conta");

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-5">
      <h1 className="text-2xl font-semibold text-ink">Entrar</h1>
      <p className="mt-1 text-sm text-muted">Acesse sua conta para ver seus pedidos e dados salvos.</p>

      {/* Vem de /auth/confirm quando o link do e-mail não vale mais. */}
      {erro === "link_invalido" && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          O link do e-mail expirou ou já tinha sido usado. Peça um novo em “Esqueci minha senha”.
        </p>
      )}

      <div className="mt-6 rounded-md border border-zinc-200 bg-white p-6">
        <FormularioLogin proximo={proximo && proximo.startsWith("/") ? proximo : "/conta"} />
      </div>
    </main>
  );
}
