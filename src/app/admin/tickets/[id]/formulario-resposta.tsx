"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { responderTicket } from "../actions";
import type { AutorRespostaTicket } from "@/types/database";

interface FormularioRespostaProps {
  ticketId: string;
}

export function FormularioResposta({ ticketId }: FormularioRespostaProps) {
  const router = useRouter();
  const [autor, setAutor] = useState<AutorRespostaTicket>("admin");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setErro(null);
    const resultado = await responderTicket(ticketId, autor, mensagem);
    setEnviando(false);
    if (!resultado.sucesso) {
      setErro(resultado.mensagem ?? "Não foi possível registrar a resposta.");
      return;
    }
    setMensagem("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="w-40">
        <label htmlFor="autor" className="mb-1 block text-xs font-medium text-muted">
          Quem está falando
        </label>
        <Select
          id="autor"
          value={autor}
          onChange={(e) => setAutor(e.target.value as AutorRespostaTicket)}
        >
          <option value="admin">Admin (resposta)</option>
          <option value="cliente">Cliente (relatado por telefone/WhatsApp)</option>
        </Select>
      </div>

      <Textarea
        rows={3}
        placeholder="Escreva a mensagem..."
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
      />

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <Button type="button" variant="primary" disabled={enviando || !mensagem.trim()} onClick={enviar}>
        {enviando ? "Enviando..." : "Adicionar à conversa"}
      </Button>
    </div>
  );
}
