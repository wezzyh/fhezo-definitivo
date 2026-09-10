import { FormularioEsqueciSenha } from "./formulario-esqueci-senha";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Receba um link por e-mail para criar uma nova senha da sua conta.",
};

export default function PaginaEsqueciSenha() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-5">
      <h1 className="text-2xl font-semibold text-ink">Recuperar senha</h1>
      <p className="mt-1 text-sm text-muted">
        Informe o e-mail cadastrado e enviaremos um link para você criar uma nova senha.
      </p>

      <div className="mt-6 rounded-md border border-zinc-200 bg-white p-6">
        <FormularioEsqueciSenha />
      </div>
    </main>
  );
}
