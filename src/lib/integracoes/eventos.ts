import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ProvedorEvento = "asaas" | "bling";

interface DadosEventoIntegracao {
  provedor: ProvedorEvento;
  evento: string;
  sucesso: boolean;
  mensagemErro?: string;
}

/**
 * Registra um evento de integração externa (sobretudo falhas de webhook e
 * de sincronização) — ver supabase/migrations/0011_eventos_integracao.sql.
 * Melhor esforço: uma falha ao GRAVAR o log nunca deve derrubar o fluxo
 * principal (webhook, sincronização) que está tentando registrar algo.
 */
export async function registrarEventoIntegracao(
  supabase: SupabaseClient,
  dados: DadosEventoIntegracao,
): Promise<void> {
  try {
    await supabase.from("eventos_integracao").insert({
      provedor: dados.provedor,
      evento: dados.evento,
      sucesso: dados.sucesso,
      mensagem_erro: dados.mensagemErro ?? null,
    });
  } catch {
    // Intencionalmente ignorado.
  }
}
