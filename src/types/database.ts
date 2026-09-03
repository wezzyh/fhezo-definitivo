// Tipos compartilhados que espelham as colunas reais das tabelas do Supabase
// (Postgres). Os nomes dos campos seguem exatamente os nomes das colunas
// (snake_case), para evitar uma camada extra de conversão.

/** Tipo de pessoa do cliente: Pessoa Física ou Pessoa Jurídica. */
export type TipoPessoa = "PF" | "PJ";

export interface Produto {
  id: string;
  sku: string;
  nome: string;
  /** Referência a categorias.id — categoria é entidade própria, não texto livre. */
  categoria_id: string;
  /** Referência a marcas.id — marca é entidade própria, não texto livre. */
  marca_id: string;
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
  /** Código de barras (EAN/GTIN), opcional. */
  ean: string | null;
  /** Código fiscal (NCM), usado na nota fiscal, opcional. */
  ncm: string | null;
  /** Título customizado para SEO da página do produto; usa o nome quando vazio. */
  seo_titulo: string | null;
  /** Meta descrição customizada para SEO da página do produto. */
  seo_descricao: string | null;
  /** URL da imagem principal do produto, opcional. */
  imagem_url: string | null;
  /** Referência cruzada para o produto correspondente no Bling (ERP). */
  bling_produto_id: number | null;
  /**
   * Último saldoVirtualTotal visto no Bling numa sincronização — não é o
   * estoque local, só a base pra calcular o delta de reposição (ver
   * sincronizarEstoqueBling em src/app/admin/integracao/bling/actions.ts).
   */
  bling_estoque_ultimo_sincronizado: number | null;
  created_at: string;
}

/** Marca de um produto — entidade própria (não texto livre). */
export interface Marca {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

/** Categoria de um produto — entidade própria, com hierarquia simples via categoria_pai_id. */
export interface Categoria {
  id: string;
  nome: string;
  slug: string;
  /** Categoria-mãe, para subcategorias (ex.: Rolamentos > Rolamentos Rígidos). `null` = categoria de topo. */
  categoria_pai_id: string | null;
  ativo: boolean;
  created_at: string;
}

export interface Cliente {
  id: string;
  tipo: TipoPessoa;
  nome: string;
  /** CPF (Pessoa Física) ou CNPJ (Pessoa Jurídica), conforme o campo "tipo". */
  documento: string;
  email: string;
  telefone: string | null;
  created_at: string;
}

export type StatusPedido =
  | "pendente"
  | "pago"
  | "em_separacao"
  | "enviado"
  | "entregue"
  | "cancelado";

export type FormaPagamento = "pix" | "boleto" | "cartao";

export interface Pedido {
  id: string;
  cliente_id: string;
  status: StatusPedido;
  total: number;
  forma_pagamento: FormaPagamento | null;
  /** ID da cobrança (payment) correspondente no Asaas. */
  asaas_payment_id: string | null;
  frete_valor: number | null;
  frete_transportadora: string | null;
  /** Endereço de entrega no momento da compra (não é o cadastro do cliente). */
  endereco_cep: string | null;
  endereco_rua: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_uf: string | null;
  /** ID do pedido de venda correspondente no Bling (ERP), depois de pago. */
  bling_pedido_id: number | null;
  /** `true` quando este pedido pago foi enviado ao Bling com sucesso. */
  bling_sincronizado: boolean;
  /** Última mensagem de erro ao tentar enviar este pedido ao Bling. */
  bling_erro_sincronizacao: string | null;
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
  /** Data/hora da última sincronização de estoque bem-sucedida (hoje só usado pelo provedor "bling"). */
  ultima_sincronizacao: string | null;
  created_at: string;
  updated_at: string;
}
