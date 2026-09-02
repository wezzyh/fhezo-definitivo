"use server";

// Cálculo de opções de frete via API sandbox do Melhor Envio.
//
// O access_token vem da tabela "integracoes" (preenchida pelo fluxo OAuth
// em src/lib/integracoes/melhorenvio.ts), renovado automaticamente via
// refresh_token quando necessário — não depende mais de um token fixo em
// variável de ambiente. A leitura usa a service_role key (ver
// src/lib/supabase/admin.ts) porque quem calcula o frete aqui é um
// visitante no checkout público, sem sessão de admin.

import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { obterTokenValidoMelhorEnvio } from "@/lib/integracoes/melhorenvio";

const URL_BASE = "https://sandbox.melhorenvio.com.br/api/v2";

export interface ItemParaFrete {
  id: string;
  larguraCm: number;
  alturaCm: number;
  comprimentoCm: number;
  pesoKg: number;
  valorUnitario: number;
  quantidade: number;
}

export interface OpcaoFrete {
  id: number;
  nome: string;
  transportadora: string;
  prazoDias: number;
  valor: number;
}

export type ResultadoFrete =
  | { sucesso: true; opcoes: OpcaoFrete[] }
  | { sucesso: false; mensagem: string };

const MENSAGEM_INDISPONIVEL =
  "Não foi possível calcular o frete agora. Você pode continuar e combinar o frete depois.";

interface OpcaoFreteBruta {
  id: number;
  name: string;
  price?: string;
  delivery_time?: number;
  company?: { name?: string };
  error?: string;
}

export async function calcularOpcoesFrete(
  cepDestino: string,
  itens: ItemParaFrete[],
): Promise<ResultadoFrete> {
  const cepOrigem = process.env.MELHOR_ENVIO_CEP_ORIGEM;
  if (!cepOrigem) {
    return { sucesso: false, mensagem: MENSAGEM_INDISPONIVEL };
  }

  let token: string | null;
  try {
    token = await obterTokenValidoMelhorEnvio(criarClienteSupabaseAdmin());
  } catch {
    token = null;
  }

  if (!token) {
    return {
      sucesso: false,
      mensagem:
        "O frete não pôde ser calculado porque a integração com o Melhor Envio não está conectada. Avise o administrador da loja.",
    };
  }

  const cepDestinoLimpo = cepDestino.replace(/\D/g, "");
  if (cepDestinoLimpo.length !== 8) {
    return { sucesso: false, mensagem: "Informe um CEP de destino válido para calcular o frete." };
  }

  if (itens.length === 0) {
    return { sucesso: false, mensagem: MENSAGEM_INDISPONIVEL };
  }

  try {
    const resposta = await fetch(`${URL_BASE}/me/shipment/calculate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Fhezo Industrial (contato@fhezoindustrial.com.br)",
      },
      body: JSON.stringify({
        from: { postal_code: cepOrigem.replace(/\D/g, "") },
        to: { postal_code: cepDestinoLimpo },
        products: itens.map((item) => ({
          id: item.id,
          width: item.larguraCm,
          height: item.alturaCm,
          length: item.comprimentoCm,
          weight: item.pesoKg,
          insurance_value: item.valorUnitario,
          quantity: item.quantidade,
        })),
      }),
      cache: "no-store",
    });

    if (!resposta.ok) {
      return { sucesso: false, mensagem: MENSAGEM_INDISPONIVEL };
    }

    const dados = (await resposta.json()) as unknown;

    if (!Array.isArray(dados)) {
      return { sucesso: false, mensagem: MENSAGEM_INDISPONIVEL };
    }

    const opcoes: OpcaoFrete[] = (dados as OpcaoFreteBruta[])
      .filter((opcao) => !opcao.error && opcao.price)
      .map((opcao) => ({
        id: opcao.id,
        nome: opcao.name,
        transportadora: opcao.company?.name ?? "",
        prazoDias: opcao.delivery_time ?? 0,
        valor: Number(opcao.price),
      }));

    if (opcoes.length === 0) {
      return {
        sucesso: false,
        mensagem: "Nenhuma opção de frete disponível para este CEP no momento.",
      };
    }

    return { sucesso: true, opcoes };
  } catch {
    return { sucesso: false, mensagem: MENSAGEM_INDISPONIVEL };
  }
}
