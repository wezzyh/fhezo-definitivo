import "server-only";

// Cotação de frete na API do Melhor Envio. Módulo só de servidor, SEM
// "use server": não é chamável direto pelo navegador. A URL da API vem de
// obterConfigMelhorEnvio (sandbox ou produção conforme MELHOR_ENVIO_ENV —
// APPSEC-028), e o token só é aceito se for do mesmo ambiente. Usado por:
// - calcularOpcoesFrete (src/lib/frete/melhorenvio.ts) — estimativa exibida
//   na tela do checkout e no drawer do carrinho;
// - calcularFreteDoPedido (src/lib/checkout/frete-pedido.ts) — o valor que
//   de fato é cobrado, recalculado no servidor ao criar o pedido.
//
// O access_token vem da tabela "integracoes" (fluxo OAuth em
// src/lib/integracoes/melhorenvio.ts), renovado automaticamente. A leitura
// usa a service_role porque quem cota aqui é um visitante sem sessão.

import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { obterConfigMelhorEnvio, type ConfigMelhorEnvio } from "@/lib/config/integracoes";
import { obterTokenValidoMelhorEnvio } from "@/lib/integracoes/melhorenvio";

export const MENSAGEM_FRETE_INDISPONIVEL = "Não foi possível calcular o frete agora. Tente novamente em instantes.";

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

export type ResultadoFrete = { sucesso: true; opcoes: OpcaoFrete[] } | { sucesso: false; mensagem: string };

// Campos da resposta de /me/shipment/calculate que este código usa. Tudo
// `unknown` de propósito: é dado externo, validado em normalizarOpcao.
interface OpcaoFreteBruta {
  id?: unknown;
  name?: unknown;
  price?: unknown;
  delivery_time?: unknown;
  company?: { name?: unknown };
  error?: unknown;
}

/**
 * Converte o `price` do Melhor Envio (hoje uma string decimal, ex. "25.90")
 * em reais arredondados para centavos. null para qualquer coisa que não seja
 * um valor monetário válido e não negativo — inclusive "25,90", "1e3",
 * "Infinity" e NaN.
 */
export function lerValorFrete(price: unknown): number | null {
  if (typeof price === "string") {
    if (!/^\d+(\.\d+)?$/.test(price.trim())) return null;
  } else if (typeof price !== "number") {
    return null;
  }

  const valor = Number(price);
  if (!Number.isFinite(valor) || valor < 0) return null;
  return Math.round(valor * 100) / 100;
}

function normalizarOpcao(bruta: OpcaoFreteBruta): OpcaoFrete | null {
  if (bruta.error) return null;
  if (typeof bruta.id !== "number" || !Number.isInteger(bruta.id)) return null;

  const valor = lerValorFrete(bruta.price);
  if (valor === null) return null;

  return {
    id: bruta.id,
    nome: typeof bruta.name === "string" ? bruta.name : "",
    transportadora: typeof bruta.company?.name === "string" ? bruta.company.name : "",
    prazoDias: typeof bruta.delivery_time === "number" && Number.isFinite(bruta.delivery_time) ? bruta.delivery_time : 0,
    valor,
  };
}

export async function cotarFreteMelhorEnvio(cepDestino: string, itens: ItemParaFrete[]): Promise<ResultadoFrete> {
  // Configuração de ambiente inválida = nenhuma chamada ao Melhor Envio.
  let config: ConfigMelhorEnvio;
  try {
    config = obterConfigMelhorEnvio();
  } catch (erro) {
    console.error("[melhor-envio] configuração inválida:", erro instanceof Error ? erro.message : "erro desconhecido");
    return { sucesso: false, mensagem: MENSAGEM_FRETE_INDISPONIVEL };
  }

  const cepOrigem = process.env.MELHOR_ENVIO_CEP_ORIGEM;
  if (!cepOrigem) {
    return { sucesso: false, mensagem: MENSAGEM_FRETE_INDISPONIVEL };
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
    return { sucesso: false, mensagem: MENSAGEM_FRETE_INDISPONIVEL };
  }

  try {
    const resposta = await fetch(`${config.urlApi}/me/shipment/calculate`, {
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
      return { sucesso: false, mensagem: MENSAGEM_FRETE_INDISPONIVEL };
    }

    const dados = (await resposta.json()) as unknown;
    if (!Array.isArray(dados)) {
      return { sucesso: false, mensagem: MENSAGEM_FRETE_INDISPONIVEL };
    }

    const opcoes = (dados as OpcaoFreteBruta[])
      .map((opcao) => (opcao && typeof opcao === "object" ? normalizarOpcao(opcao) : null))
      .filter((opcao): opcao is OpcaoFrete => opcao !== null);

    if (opcoes.length === 0) {
      return { sucesso: false, mensagem: "Nenhuma opção de frete disponível para este CEP no momento." };
    }

    return { sucesso: true, opcoes };
  } catch {
    return { sucesso: false, mensagem: MENSAGEM_FRETE_INDISPONIVEL };
  }
}
