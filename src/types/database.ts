// Tipos compartilhados que espelham (de forma simplificada) as tabelas do
// banco de dados no Supabase/Postgres. Serão refinados conforme o schema
// real das tabelas for criado.

/** Tipo de pessoa do cliente: Pessoa Física ou Pessoa Jurídica. */
export type TipoPessoa = "PF" | "PJ";

export interface Produto {
  id: string;
  nome: string;
  sku: string;
  categoria: string;
  /**
   * Atributos técnicos variam bastante por categoria (ex.: diâmetro interno
   * de um rolamento, número de elos de uma corrente, viscosidade de uma
   * graxa). Por isso usamos um campo flexível em vez de colunas fixas.
   */
  atributosTecnicos: Record<string, string | number | boolean>;
  preco: number;
  estoque: number;
}

export interface Cliente {
  id: string;
  tipo: TipoPessoa;
  nomeRazaoSocial: string;
  /** CPF (Pessoa Física) ou CNPJ (Pessoa Jurídica), conforme o campo "tipo". */
  documento: string;
  email: string;
}

export type StatusPedido =
  | "pendente"
  | "pago"
  | "em_separacao"
  | "enviado"
  | "entregue"
  | "cancelado";

export interface ItemPedido {
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
}

export interface Pedido {
  id: string;
  clienteId: string;
  itens: ItemPedido[];
  status: StatusPedido;
  total: number;
}
