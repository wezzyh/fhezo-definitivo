"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { atualizarStatusTicket } from "../actions";
import { STATUS_TICKET, TEXTO_STATUS_TICKET } from "@/lib/tickets/status";
import type { StatusTicket } from "@/types/database";

interface FormularioStatusTicketProps {
  ticketId: string;
  statusAtual: StatusTicket;
}

export function FormularioStatusTicket({ ticketId, statusAtual }: FormularioStatusTicketProps) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusTicket>(statusAtual);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const resultado = await atualizarStatusTicket(ticketId, status);
    setSalvando(false);
    if (!resultado.sucesso) {
      setErro(resultado.mensagem ?? "Não foi possível atualizar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onChange={(e) => setStatus(e.target.value as StatusTicket)} className="w-auto">
        {STATUS_TICKET.map((opcao) => (
          <option key={opcao} value={opcao}>
            {TEXTO_STATUS_TICKET[opcao]}
          </option>
        ))}
      </Select>
      <Button type="button" variant="outline" disabled={salvando || status === statusAtual} onClick={salvar}>
        {salvando ? "Salvando..." : "Salvar status"}
      </Button>
      {erro && <p className="text-xs text-[var(--admin-danger)]">{erro}</p>}
    </div>
  );
}
