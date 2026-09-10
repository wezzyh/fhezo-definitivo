"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { entrarCliente, type EstadoFormularioLogin } from "./actions";

const estadoInicial: EstadoFormularioLogin = {};

export function FormularioLogin({ proximo }: { proximo: string }) {
  const [estado, formAction, pendente] = useActionState(entrarCliente, estadoInicial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="proximo" value={proximo} />

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
          E-mail
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <label htmlFor="senha" className="block text-sm font-medium text-ink">
            Senha
          </label>
          <Link href="/esqueci-senha" className="text-xs font-medium text-brand-green hover:underline">
            Esqueci minha senha
          </Link>
        </div>
        <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <Button type="submit" variant="primary" disabled={pendente} className="w-full">
        {pendente ? "Entrando..." : "Entrar"}
      </Button>

      <p className="text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link href={`/cadastro?proximo=${encodeURIComponent(proximo)}`} className="font-medium text-brand-green hover:underline">
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}
