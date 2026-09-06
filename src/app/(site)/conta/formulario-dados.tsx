"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatarTelefone } from "@/lib/checkout/formatar";
import { atualizarDadosCliente, type EstadoFormularioConta } from "./actions";
import type { Cliente } from "@/types/database";

const estadoInicial: EstadoFormularioConta = {};

export function FormularioDados({ cliente }: { cliente: Cliente }) {
  const [estado, formAction, pendente] = useActionState(atualizarDadosCliente, estadoInicial);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-ink">
          {cliente.tipo === "PF" ? "Nome completo" : "Razão social"}
        </label>
        <Input id="nome" name="nome" defaultValue={cliente.nome} required />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">{cliente.tipo === "PF" ? "CPF" : "CNPJ"}</label>
          <Input value={cliente.documento} disabled />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">E-mail</label>
          <Input value={cliente.email} disabled />
        </div>
      </div>
      <p className="text-xs text-muted">
        Documento e e-mail não podem ser trocados por aqui — fale com o suporte se precisar alterá-los.
      </p>

      <div>
        <label htmlFor="telefone" className="mb-1 block text-sm font-medium text-ink">
          Telefone
        </label>
        <Input
          id="telefone"
          name="telefone"
          defaultValue={cliente.telefone ? formatarTelefone(cliente.telefone) : ""}
          onChange={(e) => {
            e.target.value = formatarTelefone(e.target.value);
          }}
        />
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      {estado.sucesso && <p className="text-sm text-brand-green">Dados salvos.</p>}

      <Button type="submit" variant="primary" disabled={pendente}>
        {pendente ? "Salvando..." : "Salvar dados"}
      </Button>
    </form>
  );
}
