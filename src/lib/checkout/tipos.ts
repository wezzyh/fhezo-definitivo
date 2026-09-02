export type TipoClienteCheckout = "PF" | "PJ";

export interface DadosPF {
  nomeCompleto: string;
  cpf: string;
  email: string;
  telefone: string;
}

export interface DadosPJ {
  razaoSocial: string;
  cnpj: string;
  /** Opcional — nem toda empresa (ex.: prestadoras de serviço) tem inscrição estadual. */
  inscricaoEstadual: string;
  email: string;
  telefone: string;
}

export interface EnderecoEntrega {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface FreteSelecionado {
  id: number;
  nome: string;
  transportadora: string;
  prazoDias: number;
  valor: number;
}
