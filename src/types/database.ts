// Tipos compartilhados que espelham as colunas reais das tabelas do Supabase
// (Postgres). Os nomes dos campos seguem exatamente os nomes das colunas
// (snake_case), para evitar uma camada extra de conversão.

/** Tipo de pessoa do cliente: Pessoa Física ou Pessoa Jurídica. */
export type TipoPessoa = "PF" | "PJ";

export interface Produto {
  id: string;
  sku: string;
  nome: string;
  categoria: string;
  descricao: string | null;
  /**
   * Atributos técnicos variam bastante por categoria (ex.: diâmetro interno
   * de um rolamento, número de elos de uma corrente, viscosidade de uma
   * graxa). Por isso é um campo jsonb flexível em vez de colunas fixas.
   */
  atributos: Record<string, string | number | boolean> | null;
  preco: number;
  estoque: number;
  ativo: boolean;
  /** Usado no cálculo de frete (Melhor Envio). */
  peso_kg: number;
  altura_cm: number;
  largura_cm: number;
  comprimento_cm: number;
  created_at: string;
}

export interface Cliente {
  id: string;
  tipo: TipoPessoa;
  nome_razao_social: string;
  /** CPF (Pessoa Física) ou CNPJ (Pessoa Jurídica), conforme o campo "tipo". */
  documento: string;
  email: string;
  created_at: string;
}

export type StatusPedido =
  | "pendente"
  | "pago"
  | "em_separacao"
  | "enviado"
  | "entregue"
  | "cancelado";

export interface Pedido {
  id: string;
  cliente_id: string;
  status: StatusPedido;
  total: number;
  created_at: string;
}

/** Item de um pedido — linha da tabela "pedido_itens". */
export interface PedidoItem {
  id: string;
  pedido_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
}

/**
 * Tokens OAuth de uma integração externa (ex.: Melhor Envio), guardados de
 * forma persistente porque expiram e precisam ser renovados em runtime.
 */
export interface Integracao {
  id: string;
  provedor: string;
  access_token: string | null;
  refresh_token: string | null;
  expira_em: string | null;
  created_at: string;
  updated_at: string;
}
