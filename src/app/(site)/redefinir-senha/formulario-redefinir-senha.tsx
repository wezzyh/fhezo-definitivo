"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redefinirSenha, type EstadoRedefinirSenha } from "./actions";

const estadoInicial: EstadoRedefinirSenha = {};

export function FormularioRedefinirSenha() {
  const [estado, formAction, pendente] = useActionState(redefinirSenha, estadoInicial);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="senha" className="mb-1 block text-sm font-medium text-ink">
          Nova senha
        </label>
        <Input id="senha" name="senha" type="password" autoComplete="new-password" required minLength={6} />
        <p className="mt-1 text-xs text-muted">Mínimo de 6 caracteres.</p>
      </div>

      <div>
        <label htmlFor="confirmacao" className="mb-1 block text-sm font-medium text-ink">
          Repita a nova senha
        </label>
        <Input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" required minLength={6} />
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <Button type="submit" variant="primary" disabled={pendente} className="w-full">
        {pendente ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
