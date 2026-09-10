"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pedirRedefinicaoSenha, type EstadoEsqueciSenha } from "./actions";

const estadoInicial: EstadoEsqueciSenha = {};

export function FormularioEsqueciSenha() {
  const [estado, formAction, pendente] = useActionState(pedirRedefinicaoSenha, estadoInicial);

  if (estado.enviado) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink">
          Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha. O link vale por 1 hora.
        </p>
        <p className="text-sm text-muted">
          Não chegou? Confira a caixa de spam antes de pedir de novo — pedidos seguidos são bloqueados por alguns
          minutos.
        </p>
        <Link href="/login" className="inline-block text-sm font-medium text-brand-green hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
          E-mail da conta
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <Button type="submit" variant="primary" disabled={pendente} className="w-full">
        {pendente ? "Enviando..." : "Enviar link de recuperação"}
      </Button>

      <p className="text-center text-sm text-muted">
        Lembrou a senha?{" "}
        <Link href="/login" className="font-medium text-brand-green hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
