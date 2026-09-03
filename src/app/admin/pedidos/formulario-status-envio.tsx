"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { atualizarStatusEnvioPedido } from "./actions";
import type { StatusPedido } from "@/types/database";

const OPCOES: { valor: StatusPedido; rotulo: string }[] = [
  { valor: "em_separacao", rotulo: "Em separação" },
  { valor: "enviado", rotulo: "Enviado" },
  { valor: "entregue", rotulo: "Entregue" },
];

interface FormularioStatusEnvioProps {
  pedidoId: string;
  statusAtual: StatusPedido;
}

export function FormularioStatusEnvio({ pedidoId, statusAtual }: FormularioStatusEnvioProps) {
  const [status, setStatus] = useState<StatusPedido>(
    statusAtual === "em_separacao" || statusAtual === "enviado" || statusAtual === "entregue"
      ? statusAtual
      : "em_separacao",
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const resultado = await atualizarStatusEnvioPedido(pedidoId, status);
    setSalvando(false);
    if (!resultado.sucesso) {
      setErro(resultado.mensagem ?? "Não foi possível atualizar.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={status}
        onChange={(e) => setStatus(e.target.value as StatusPedido)}
        className="w-auto"
      >
        {OPCOES.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </Select>
      <Button type="button" variant="outline" disabled={salvando} onClick={salvar}>
        {salvando ? "Salvando..." : "Salvar"}
      </Button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
