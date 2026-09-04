"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRIORIDADES_TICKET, TEXTO_PRIORIDADE_TICKET } from "@/lib/tickets/status";
import { criarTicket, type EstadoFormularioTicket } from "./actions";
import type { Cliente, Pedido } from "@/types/database";

interface FormularioTicketProps {
  clientes: Pick<Cliente, "id" | "nome" | "documento">[];
  pedidos: (Pick<Pedido, "id" | "total" | "created_at"> & { cliente: { nome: string } | null })[];
}

const estadoInicial: EstadoFormularioTicket = {};

export function FormularioTicket({ clientes, pedidos }: FormularioTicketProps) {
  const [estado, formAction, pendente] = useActionState(criarTicket, estadoInicial);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="assunto" className="mb-1 block text-sm font-medium text-ink">
          Assunto *
        </label>
        <Input id="assunto" name="assunto" required placeholder="Ex.: Produto veio com defeito" />
      </div>

      <div>
        <label htmlFor="mensagem" className="mb-1 block text-sm font-medium text-ink">
          Mensagem *
        </label>
        <Textarea
          id="mensagem"
          name="mensagem"
          rows={4}
          required
          placeholder="Descreva o que o cliente relatou (ex.: reclamação recebida por telefone/WhatsApp)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cliente_id" className="mb-1 block text-sm font-medium text-ink">
            Cliente
          </label>
          <Select id="cliente_id" name="cliente_id" defaultValue="">
            <option value="">Não cadastrado</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome} — {cliente.documento}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="prioridade" className="mb-1 block text-sm font-medium text-ink">
            Prioridade
          </label>
          <Select id="prioridade" name="prioridade" defaultValue="normal">
            {PRIORIDADES_TICKET.map((prioridade) => (
              <option key={prioridade} value={prioridade}>
                {TEXTO_PRIORIDADE_TICKET[prioridade]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label htmlFor="pedido_id" className="mb-1 block text-sm font-medium text-ink">
          Pedido relacionado
        </label>
        <Select id="pedido_id" name="pedido_id" defaultValue="">
          <option value="">Nenhum</option>
          {pedidos.map((pedido) => (
            <option key={pedido.id} value={pedido.id}>
              #{pedido.id.replace(/-/g, "").slice(0, 8).toUpperCase()} — {pedido.cliente?.nome ?? "—"} —{" "}
              {pedido.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} —{" "}
              {new Date(pedido.created_at).toLocaleDateString("pt-BR")}
            </option>
          ))}
        </Select>
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <Button type="submit" variant="primary" disabled={pendente}>
        {pendente ? "Criando..." : "Criar ticket"}
      </Button>
    </form>
  );
}
