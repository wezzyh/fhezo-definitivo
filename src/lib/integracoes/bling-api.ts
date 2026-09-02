import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { obterTokenValidoBling } from "./bling";

// Cliente da API de recursos do Bling (produtos, contatos, pedidos de
// venda). Nunca deve ser importado por um Client Component (ver
// import "server-only" acima). Toda chamada:
// - renova o token automaticamente quando necessário (obterTokenValidoBling);
// - inclui o header `enable-jwt: 1`, exigido em toda chamada de recurso;
// - trata o limite de requisições da API (3 req/s — HTTP 429) com uma
//   nova tentativa simples, com um pequeno atraso crescente.
// Fonte dos limites: https://developer.bling.com.br/limites

const URL_BASE = "https://api.bling.com.br/Api/v3";

export type ResultadoBling<T> = { sucesso: true; dados: T } | { sucesso: false; mensagem: string };

interface ErroBling {
  error?: { type?: string; message?: string; description?: string; fields?: { message?: string }[] };
}

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function chamarBling<T>(
  supabase: SupabaseClient,
  caminho: string,
  opcoes: { method?: string; body?: unknown } = {},
  tentativa = 1,
): Promise<ResultadoBling<T>> {
  const token = await obterTokenValidoBling(supabase);
  if (!token) {
    return {
      sucesso: false,
      mensagem: "A integração com o Bling não está conectada. Conecte em Integrações no /admin.",
    };
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${URL_BASE}${caminho}`, {
      method: opcoes.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "enable-jwt": "1",
      },
      body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
      cache: "no-store",
    });
  } catch {
    return {
      sucesso: false,
      mensagem: "Não foi possível conectar ao Bling agora. Tente novamente em instantes.",
    };
  }

  if (resposta.status === 429) {
    if (tentativa < 3) {
      await aguardar(500 * tentativa);
      return chamarBling<T>(supabase, caminho, opcoes, tentativa + 1);
    }
    return {
      sucesso: false,
      mensagem: "O Bling está recebendo muitas requisições agora (limite de 3 por segundo). Tente novamente em instantes.",
    };
  }

  const dados: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const erro = dados as ErroBling | null;
    const descricao =
      erro?.error?.message ||
      erro?.error?.description ||
      erro?.error?.fields?.map((campo) => campo.message).filter(Boolean).join(" ");
    return {
      sucesso: false,
      mensagem: descricao || `O Bling recusou a solicitação (status ${resposta.status}).`,
    };
  }

  return { sucesso: true, dados: dados as T };
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

export interface ProdutoBlingResumo {
  id: number;
  codigo: string;
  nome: string;
  estoque?: { saldoVirtualTotal?: number };
}

interface ListaProdutosBling {
  data: ProdutoBlingResumo[];
}

const LIMITE_POR_PAGINA_PRODUTOS = 100;
const MAX_PAGINAS_PRODUTOS = 50; // segurança: até 5.000 produtos

/** Busca todos os produtos cadastrados no Bling, paginando automaticamente. */
export async function buscarTodosProdutosBling(
  supabase: SupabaseClient,
): Promise<ResultadoBling<ProdutoBlingResumo[]>> {
  const todos: ProdutoBlingResumo[] = [];

  for (let pagina = 1; pagina <= MAX_PAGINAS_PRODUTOS; pagina++) {
    const resultado = await chamarBling<ListaProdutosBling>(
      supabase,
      `/produtos?pagina=${pagina}&limite=${LIMITE_POR_PAGINA_PRODUTOS}`,
    );

    if (!resultado.sucesso) {
      if (todos.length > 0) break; // mantém o que já foi buscado com sucesso
      return resultado;
    }

    todos.push(...resultado.dados.data);
    if (resultado.dados.data.length < LIMITE_POR_PAGINA_PRODUTOS) break;
  }

  return { sucesso: true, dados: todos };
}

// ---------------------------------------------------------------------------
// Contatos
// ---------------------------------------------------------------------------

interface ListaContatosBling {
  data: { id: number; numeroDocumento: string }[];
}

/** Busca um contato pelo CPF/CNPJ. Retorna `null` (sucesso) se não encontrar. */
export async function buscarContatoBlingPorDocumento(
  supabase: SupabaseClient,
  documento: string,
): Promise<ResultadoBling<number | null>> {
  const documentoLimpo = documento.replace(/\D/g, "");

  const resultado = await chamarBling<ListaContatosBling>(
    supabase,
    `/contatos?numeroDocumento=${documentoLimpo}`,
  );

  if (!resultado.sucesso) return resultado;

  const encontrado = resultado.dados.data[0];
  return { sucesso: true, dados: encontrado ? encontrado.id : null };
}

export interface DadosContatoBling {
  nome: string;
  documento: string;
  email?: string;
  telefone?: string;
  tipo: "F" | "J";
  endereco?: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
}

interface CriarContatoBlingResposta {
  data: { id: number };
}

export async function criarContatoBling(
  supabase: SupabaseClient,
  dados: DadosContatoBling,
): Promise<ResultadoBling<{ id: number }>> {
  const corpo: Record<string, unknown> = {
    nome: dados.nome,
    numeroDocumento: dados.documento.replace(/\D/g, ""),
    tipo: dados.tipo,
    email: dados.email || undefined,
    telefone: dados.telefone || undefined,
  };

  if (dados.endereco) {
    corpo.endereco = {
      geral: {
        endereco: dados.endereco.logradouro,
        cep: dados.endereco.cep.replace(/\D/g, ""),
        bairro: dados.endereco.bairro,
        municipio: dados.endereco.cidade,
        uf: dados.endereco.uf,
        numero: dados.endereco.numero,
        complemento: dados.endereco.complemento || undefined,
      },
    };
  }

  const resultado = await chamarBling<CriarContatoBlingResposta>(supabase, "/contatos", {
    method: "POST",
    body: corpo,
  });

  if (!resultado.sucesso) return resultado;
  return { sucesso: true, dados: { id: resultado.dados.data.id } };
}

/** Busca o contato pelo CPF/CNPJ; se não existir no Bling, cria. */
export async function buscarOuCriarContatoBling(
  supabase: SupabaseClient,
  dados: DadosContatoBling,
): Promise<ResultadoBling<{ id: number }>> {
  const busca = await buscarContatoBlingPorDocumento(supabase, dados.documento);
  if (!busca.sucesso) return busca;
  if (busca.dados) return { sucesso: true, dados: { id: busca.dados } };
  return criarContatoBling(supabase, dados);
}

// ---------------------------------------------------------------------------
// Pedidos de venda
// ---------------------------------------------------------------------------

export interface ItemPedidoVendaBling {
  blingProdutoId: number;
  codigo: string;
  descricao: string;
  quantidade: number;
  valor: number;
}

export interface DadosPedidoVendaBling {
  contatoBlingId: number;
  itens: ItemPedidoVendaBling[];
  freteValor: number;
  observacoes?: string;
}

interface CriarPedidoVendaBlingResposta {
  data: { id: number };
}

export async function criarPedidoVendaBling(
  supabase: SupabaseClient,
  dados: DadosPedidoVendaBling,
): Promise<ResultadoBling<{ id: number }>> {
  const formaPagamentoId = process.env.BLING_FORMA_PAGAMENTO_ID;
  if (!formaPagamentoId) {
    return {
      sucesso: false,
      mensagem:
        "BLING_FORMA_PAGAMENTO_ID não configurada — defina o ID de uma forma de pagamento cadastrada no Bling.",
    };
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const valorItens = dados.itens.reduce((total, item) => total + item.valor * item.quantidade, 0);

  const corpo = {
    data: hoje,
    dataSaida: hoje,
    dataPrevista: hoje,
    contato: { id: dados.contatoBlingId },
    itens: dados.itens.map((item) => ({
      codigo: item.codigo,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor: item.valor,
      produto: { id: item.blingProdutoId },
    })),
    parcelas: [
      {
        dataVencimento: hoje,
        valor: valorItens + dados.freteValor,
        formaPagamento: { id: Number(formaPagamentoId) },
      },
    ],
    transporte: dados.freteValor > 0 ? { frete: dados.freteValor } : undefined,
    observacoes: dados.observacoes,
  };

  const resultado = await chamarBling<CriarPedidoVendaBlingResposta>(supabase, "/pedidos/vendas", {
    method: "POST",
    body: corpo,
  });

  if (!resultado.sucesso) return resultado;
  return { sucesso: true, dados: { id: resultado.dados.data.id } };
}
