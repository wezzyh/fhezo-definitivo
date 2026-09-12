"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { reenviarConfirmacaoEmail, type EstadoFormularioCadastro } from "./actions";

const estadoInicial: EstadoFormularioCadastro = {};

/** Tela final quando o projeto exige confirmar o e-mail antes da primeira sessão. */
export function ConfirmeSeuEmail({ email }: { email: string }) {
  const [estadoReenvio, acaoReenvio, reenviando] = useActionState(reenviarConfirmacaoEmail, estadoInicial);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  // A tela troca inteira: o foco vai para o título, para leitores de tela
  // anunciarem o resultado em vez de ficarem num botão que sumiu.
  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  return (
    <div className="space-y-3">
      <h2 ref={tituloRef} tabIndex={-1} className="text-lg font-semibold text-brand-green-dark outline-none">
        Conta criada! Confirme seu e-mail para entrar.
      </h2>
      <p className="text-sm text-muted">
        Enviamos o link para <strong className="text-ink">{email}</strong>. Confira também a caixa de spam.
      </p>

      <form action={acaoReenvio}>
        <input type="hidden" name="email" value={email} />
        <Button type="submit" variant="outline" className="min-h-11" loading={reenviando}>
          {reenviando ? "Reenviando..." : "Reenviar e-mail de confirmação"}
        </Button>
      </form>

      <div role="status">
        {estadoReenvio.mensagemSucesso && <p className="text-sm text-brand-green">{estadoReenvio.mensagemSucesso}</p>}
        {estadoReenvio.erro && <p className="text-sm text-red-600">{estadoReenvio.erro}</p>}
      </div>

      <Link
        href="/login"
        className="inline-flex min-h-11 items-center text-sm font-medium text-brand-green hover:underline"
      >
        Já confirmei — ir para o login
      </Link>
    </div>
  );
}
