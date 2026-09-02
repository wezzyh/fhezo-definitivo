"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { entrarAdmin, type EstadoLogin } from "./actions";

const estadoInicial: EstadoLogin = {};

export default function PaginaLoginAdmin() {
  const [estado, formAction, pendente] = useActionState(entrarAdmin, estadoInicial);

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm rounded-md border border-zinc-200 bg-white p-8">
        <h1 className="text-lg font-semibold text-ink">Painel Administrativo — FHEZO</h1>
        <p className="mt-1 text-sm text-muted">Acesso restrito ao administrador.</p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
              Email
            </label>
            <Input id="email" name="email" type="email" required autoComplete="username" />
          </div>
          <div>
            <label htmlFor="senha" className="mb-1 block text-sm font-medium text-ink">
              Senha
            </label>
            <Input id="senha" name="senha" type="password" required autoComplete="current-password" />
          </div>

          {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

          <Button type="submit" variant="primary" className="w-full" disabled={pendente}>
            {pendente ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
