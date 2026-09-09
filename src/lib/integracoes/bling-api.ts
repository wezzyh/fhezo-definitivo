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
  preco?: number;
  estoque?: { saldoVirtualTotal?: number };
}

interface ListaProdutosBling {
  data: ProdutoBlingResumo[];
}

/**
 * Subconjunto do detalhe de produto (GET /produtos/{id}) que nos
 * interessa — só os campos que o endpoint de lista (/produtos) NÃO traz:
 * descrições completas, galeria de imagens, marca/peso/NCM/EAN
 * estruturados. Confirmado contra a API real (ver bling-erp-api-js,
 * IFindResponse) e contra o cadastro real do usuário no Bling: ele não usa
 * "campos personalizados" — as especificações técnicas que ele digita
 * (ex.: "Vedação: 2RS") ficam soltas dentro de descricaoCurta/
 * descricaoComplementar, sem campo estruturado equivalente. Dimensões
 * (largura/altura/profundidade) foram deixadas de fora deliberadamente: a
 * API não deixa claro o código da unidade de medida, e converter errado
 * corromperia o cálculo de frete — mais seguro deixar como está
 * (preenchimento manual) do que arriscar.
 */
export interface ProdutoBlingDetalhe {
  id: number;
  descricaoCurta?: string;
  descricaoComplementar?: string;
  marca?: string;
  gtin?: string;
  pesoLiquido?: number;
  pesoBruto?: number;
  tributacao?: { ncm?: string };
  midia?: {
    imagens?: {
      externas?: { link: string }[];
      internas?: { linkMiniatura: string; ordem?: number }[];
    };
  };
}

interface DetalheProdutoBlingResposta {
  data: ProdutoBlingDetalhe;
}

/** Busca o detalhe completo de UM produto no Bling (GET /produtos/{id}) — usado só quando falta algo que o endpoint de lista não traz (descrição, imagens, marca/peso/NCM/EAN), nunca na sincronização em massa de estoque (custaria 1 chamada por produto, contra o limite de 3 req/s do Bling). */
export async function buscarDetalheProdutoBling(
  supabase: SupabaseClient,
  blingProdutoId: number,
): Promise<ResultadoBling<ProdutoBlingDetalhe>> {
  const resultado = await chamarBling<DetalheProdutoBlingResposta>(supabase, `/produtos/${blingProdutoId}`);
  if (!resultado.sucesso) return resultado;
  return { sucesso: true, dados: resultado.dados.data };
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

function montarCorpoContatoBling(dados: DadosContatoBling): Record<string, unknown> {
  const corpo: Record<string, unknown> = {
    nome: dados.nome,
    numeroDocumento: dados.documento.replace(/\D/g, ""),
    tipo: dados.tipo,
    // Obrigatório no PUT /contatos/{id} — sem ele o Bling rejeita com
    // "Situação inválida" (confirmado direto na API real), mesmo sem
    // nenhum campo "situacao" ter sido enviado. "A" = ativo.
    situacao: "A",
    email: dados.email || undefined,
    telefone: dados.telefone || undefined,
  };

  // Formato confirmado direto na API real do Bling (GET /contatos/{id}
  // retorna essa mesma estrutura em endereco.geral): sem isso preenchido,
  // o Bling recusa a emissão de NF-e por "pendência cadastral" no contato.
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

  return corpo;
}

export async function criarContatoBling(
  supabase: SupabaseClient,
  dados: DadosContatoBling,
): Promise<ResultadoBling<{ id: number }>> {
  const resultado = await chamarBling<CriarContatoBlingResposta>(supabase, "/contatos", {
    method: "POST",
    body: montarCorpoContatoBling(dados),
  });

  if (!resultado.sucesso) return resultado;
  return { sucesso: true, dados: { id: resultado.dados.data.id } };
}

/**
 * Atualiza um contato já existente no Bling (PUT /contatos/{id}) com os
 * dados mais recentes que temos, incluindo endereço — usado quando o
 * contato já existia lá (ex.: cadastrado manualmente, sem endereço) e
 * precisamos completar os campos que o Bling exige para emitir NF-e.
 */
export async function atualizarContatoBling(
  supabase: SupabaseClient,
  contatoId: number,
  dados: DadosContatoBling,
): Promise<ResultadoBling<{ id: number }>> {
  // PUT /contatos/{id} responde 204 No Content (sem corpo) quando dá
  // certo — diferente do POST, que devolve {data: {id}}. Não dá pra ler
  // o id da resposta aqui; já temos ele (é o parâmetro contatoId).
  const resultado = await chamarBling<unknown>(supabase, `/contatos/${contatoId}`, {
    method: "PUT",
    body: montarCorpoContatoBling(dados),
  });

  if (!resultado.sucesso) return resultado;
  return { sucesso: true, dados: { id: contatoId } };
}

/**
 * Busca o contato pelo CPF/CNPJ. Se não existir no Bling, cria. Se já
 * existir, ATUALIZA com os dados mais recentes (nome/email/telefone e,
 * principalmente, endereço) — um contato criado manualmente no Bling antes
 * desta integração pode não ter endereço completo, o que trava a emissão
 * de NF-e depois. Se a atualização falhar, ainda assim segue com o ID já
 * encontrado (o pedido de venda não depende do contato estar 100%
 * completo — só a NF-e depende, e essa etapa ainda não está implementada).
 */
export async function buscarOuCriarContatoBling(
  supabase: SupabaseClient,
  dados: DadosContatoBling,
): Promise<ResultadoBling<{ id: number }>> {
  const busca = await buscarContatoBlingPorDocumento(supabase, dados.documento);
  if (!busca.sucesso) return busca;

  if (busca.dados) {
    const atualizacao = await atualizarContatoBling(supabase, busca.dados, dados);
    if (atualizacao.sucesso) return atualizacao;
    return { sucesso: true, dados: { id: busca.dados } };
  }

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
