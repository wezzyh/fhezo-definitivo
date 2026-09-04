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
  /** Preço "de" (riscado), opcional — só exibição de desconto na loja, não afeta cobrança. */
  preco_de: number | null;
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

/**
 * Dados de CRM B2B enxuto de um cliente — tabela própria "clientes_crm",
 * 1:1 com "clientes" (ver nota de arquitetura na migração 0013 sobre por
 * que não são colunas direto em "clientes"). "Última compra"/"último
 * contato" NÃO ficam aqui — são calculados a partir de "pedidos" (ver
 * ClienteCrmResumo).
 */
export interface ClienteCrm {
  cliente_id: string;
  /** Contato principal dentro da empresa (relevante sobretudo para PJ). */
  nome_comprador: string | null;
  segmento: string | null;
  /** Texto livre, ex.: "Ligar dia 15 para renovar cotação". */
  proxima_acao: string | null;
  proxima_acao_data: string | null;
  valor_potencial: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Linha da view "clientes_crm_resumo" — junta clientes + clientes_crm +
 * a data do pedido mais recente do cliente. Usada em /admin/clientes.
 */
export interface ClienteCrmResumo {
  cliente_id: string;
  tipo: TipoPessoa;
  nome: string;
  documento: string;
  email: string;
  telefone: string | null;
  cliente_criado_em: string;
  nome_comprador: string | null;
  segmento: string | null;
  proxima_acao: string | null;
  proxima_acao_data: string | null;
  valor_potencial: number | null;
  observacoes: string | null;
  crm_atualizado_em: string | null;
  /** Data do pedido mais recente do cliente — null se nunca comprou. */
  ultima_compra_em: string | null;
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

export type StatusTicket = "aberto" | "em_andamento" | "resolvido" | "fechado";
export type PrioridadeTicket = "baixa" | "normal" | "alta";
export type AutorRespostaTicket = "cliente" | "admin";

/**
 * Ticket de suporte/atendimento — criado manualmente pelo admin por
 * enquanto (sem formulário público ainda, ver migração 0014).
 * "mensagem" é o relato inicial; a conversa continua em
 * "ticket_respostas" (ver TicketResposta).
 */
export interface Ticket {
  id: string;
  /** Opcional: o ticket pode vir de alguém ainda não cadastrado em "clientes". */
  cliente_id: string | null;
  /** Opcional: vincula o ticket a um pedido específico. */
  pedido_id: string | null;
  assunto: string;
  mensagem: string;
  status: StatusTicket;
  prioridade: PrioridadeTicket;
  created_at: string;
  updated_at: string;
}

/** Uma mensagem no histórico de conversa de um ticket. */
export interface TicketResposta {
  id: string;
  ticket_id: string;
  autor: AutorRespostaTicket;
  mensagem: string;
  created_at: string;
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

export type TipoConteudoSite = "menu" | "home" | "tema";

/**
 * Conteúdo do site versionado (menu, home, tema), editável pelo admin sem
 * deploy. Cada linha é uma versão IMUTÁVEL de um "tipo" — nunca é
 * sobrescrita, só marcada publicado=true/false (no máximo uma versão
 * publicada por tipo, garantido por índice único parcial no banco).
 * Formato de "dados" depende de "tipo" — ver src/lib/conteudo/tipos.ts.
 */
export interface ConteudoSite {
  id: string;
  tipo: TipoConteudoSite;
  dados: Record<string, unknown>;
  versao: number;
  publicado: boolean;
  created_at: string;
  created_by: string | null;
}

/**
 * Banner do site, versionado POR ITEM — diferente de conteudo_site,
 * "banner_id" é estável entre versões (o "id" da linha muda a cada
 * versão), permitindo editar/publicar/restaurar um banner sem afetar os
 * demais. Formato de "dados" — ver DadosBanner em src/lib/conteudo/tipos.ts.
 */
export interface Banner {
  id: string;
  banner_id: string;
  dados: Record<string, unknown>;
  versao: number;
  publicado: boolean;
  created_at: string;
  created_by: string | null;
}
