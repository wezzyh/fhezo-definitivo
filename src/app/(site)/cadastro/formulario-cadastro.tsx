"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cadastrarCliente, reenviarConfirmacaoEmail, type EstadoFormularioCadastro } from "./actions";

const estadoInicial: EstadoFormularioCadastro = {};

export function FormularioCadastro({ proximo }: { proximo: string }) {
  const [estado, formAction, pendente] = useActionState(cadastrarCliente, estadoInicial);
  const [estadoReenvio, acaoReenvio, reenviando] = useActionState(reenviarConfirmacaoEmail, estadoInicial);
  const [tipo, setTipo] = useState<"PF" | "PJ">("PF");
  // Controlado só para que a tela de "confirme seu e-mail" saiba para qual
  // endereço reenviar — useActionState não devolve o FormData enviado.
  const [email, setEmail] = useState("");

  if (estado.mensagemSucesso) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-brand-green">{estado.mensagemSucesso}</p>
        <p className="text-sm text-muted">
          Enviamos o link para <strong className="text-ink">{email}</strong>. Confira também a caixa de spam.
        </p>

        <form action={acaoReenvio}>
          <input type="hidden" name="email" value={email} />
          <Button type="submit" variant="outline" disabled={reenviando}>
            {reenviando ? "Reenviando..." : "Reenviar e-mail de confirmação"}
          </Button>
        </form>

        {estadoReenvio.mensagemSucesso && (
          <p className="text-sm text-brand-green">{estadoReenvio.mensagemSucesso}</p>
        )}
        {estadoReenvio.erro && <p className="text-sm text-red-600">{estadoReenvio.erro}</p>}

        <Link href="/login" className="inline-block text-sm font-medium text-brand-green hover:underline">
          Já confirmei — ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="proximo" value={proximo} />
      <input type="hidden" name="tipo" value={tipo} />

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setTipo("PF")}
          className={`rounded-md border px-3 py-1.5 font-medium ${tipo === "PF" ? "border-brand-green bg-brand-green/10 text-brand-green-dark" : "border-zinc-300 text-muted"}`}
        >
          Pessoa física
        </button>
        <button
          type="button"
          onClick={() => setTipo("PJ")}
          className={`rounded-md border px-3 py-1.5 font-medium ${tipo === "PJ" ? "border-brand-green bg-brand-green/10 text-brand-green-dark" : "border-zinc-300 text-muted"}`}
        >
          Pessoa jurídica
        </button>
      </div>

      <div>
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-ink">
          {tipo === "PF" ? "Nome completo" : "Razão social"}
        </label>
        <Input id="nome" name="nome" required />
      </div>

      <div>
        <label htmlFor="documento" className="mb-1 block text-sm font-medium text-ink">
          {tipo === "PF" ? "CPF" : "CNPJ"}
        </label>
        <Input id="documento" name="documento" inputMode="numeric" required />
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
          E-mail
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="senha" className="mb-1 block text-sm font-medium text-ink">
          Senha
        </label>
        <Input id="senha" name="senha" type="password" autoComplete="new-password" minLength={6} required />
        <p className="mt-1 text-xs text-muted">Pelo menos 6 caracteres.</p>
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <Button type="submit" variant="primary" disabled={pendente} className="w-full">
        {pendente ? "Criando conta..." : "Criar conta"}
      </Button>

      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href={`/login?proximo=${encodeURIComponent(proximo)}`} className="font-medium text-brand-green hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
