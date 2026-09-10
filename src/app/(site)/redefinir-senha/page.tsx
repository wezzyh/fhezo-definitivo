import Link from "next/link";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { FormularioRedefinirSenha } from "./formulario-redefinir-senha";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criar nova senha",
};

// Só é alcançável com a sessão temporária criada pelo link de recuperação
// (ver src/app/auth/confirm/route.ts). Sem sessão, em vez de redirecionar
// para /login em silêncio, explica o que aconteceu — cair no login sem
// motivo aparente é o que mais confunde nesse fluxo.
export default async function PaginaRedefinirSenha() {
  const supabase = await criarClienteSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-5">
        <h1 className="text-2xl font-semibold text-ink">Link expirado</h1>
        <p className="mt-3 text-sm text-muted">
          Este link de recuperação não é mais válido. Ele vale por 1 hora, só pode ser usado uma vez e precisa ser
          aberto no mesmo navegador em que você pediu a recuperação.
        </p>
        <Link
          href="/esqueci-senha"
          className="mt-4 inline-block text-sm font-medium text-brand-green hover:underline"
        >
          Pedir um novo link
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-5">
      <h1 className="text-2xl font-semibold text-ink">Criar nova senha</h1>
      <p className="mt-1 text-sm text-muted">Defina a nova senha da conta {user.email}.</p>

      <div className="mt-6 rounded-md border border-zinc-200 bg-white p-6">
        <FormularioRedefinirSenha />
      </div>
    </main>
  );
}
