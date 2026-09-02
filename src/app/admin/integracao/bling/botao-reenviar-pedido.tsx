"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { reenviarPedidoParaBlingAction } from "./actions";

export function BotaoReenviarPedidoBling({ pedidoId }: { pedidoId: string }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function lidarComClique() {
    setEnviando(true);
    setErro(null);
    const resultado = await reenviarPedidoParaBlingAction(pedidoId);
    setEnviando(false);
    if (!resultado.sucesso) {
      setErro(resultado.mensagem ?? "Falha ao sincronizar.");
    }
    // Em caso de sucesso, revalidatePath já atualiza a lista no próximo
    // carregamento — a Server Action já removeu (ou removerá) este pedido
    // da lista de pendentes.
  }

  return (
    <div className="text-right">
      <Button type="button" variant="outline" disabled={enviando} onClick={lidarComClique}>
        {enviando ? "Enviando..." : "Tentar novamente"}
      </Button>
      {erro && <p className="mt-1 max-w-xs text-xs text-red-600">{erro}</p>}
    </div>
  );
}
