import "server-only";

import { obterConfigAsaas, type ConfigAsaas } from "@/lib/config/integracoes";

// Cliente da API do Asaas — criação de cliente/cobrança e consulta de
// status. URL e chave vêm de obterConfigAsaas (src/lib/config/integracoes.ts):
// sandbox ou produção conforme ASAAS_ENV, conferido contra o ambiente do
// deploy (APPSEC-028). ASAAS_API_KEY nunca deve chegar ao navegador: o import
// de "server-only" quebra o build se este arquivo acabar sendo importado por
// um Client Component. Só deve ser chamado a partir de Server Actions ou
// Route Handlers (src/app/(site)/checkout/pagamento/actions.ts e
// src/app/api/webhooks/asaas/route.ts).

/** `statusHttp` presente quando o Asaas respondeu com erro — ausente em falha de rede/configuração. */
export type ResultadoAsaas<T> =
  | { sucesso: true; dados: T }
  | { sucesso: false; mensagem: string; statusHttp?: number };

const MENSAGEM_PAGAMENTO_INDISPONIVEL =
  "O pagamento está indisponível no momento. Tente novamente mais tarde.";

async function chamarAsaas<T>(
  caminho: string,
  opcoes: { method?: string; body?: unknown } = {},
): Promise<ResultadoAsaas<T>> {
  // Configuração inválida (ambiente errado, chave ausente ou de outro
  // ambiente) = nenhuma chamada ao Asaas. Falha fechado, sem fallback.
  let config: ConfigAsaas;
  try {
    config = obterConfigAsaas();
  } catch (erro) {
    console.error(
      "[asaas] configuração inválida:",
      erro instanceof Error ? erro.message : "erro desconhecido",
    );
    return { sucesso: false, mensagem: MENSAGEM_PAGAMENTO_INDISPONIVEL };
  }

  let resposta: Response;

  try {
    resposta = await fetch(`${config.urlApi}${caminho}`, {
      method: opcoes.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        access_token: config.chaveApi,
        "User-Agent": "Fhezo Industrial (contato@fhezoindustrial.com.br)",
      },
      body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
      redirect: "error",
    });
  } catch {
    return {
      sucesso: false,
      mensagem:
        "Não foi possível conectar ao Asaas agora. Tente novamente em instantes.",
    };
  }

  const dados: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    return {
      sucesso: false,
      mensagem: "Não foi possível processar a solicitação de pagamento.",
      statusHttp: resposta.status,
    };
  }

  return { sucesso: true, dados: dados as T };
}

// ---------------------------------------------------------------------------
// Cliente (customer) no Asaas
// ---------------------------------------------------------------------------

export interface DadosClienteAsaas {
  nome: string;
  documento: string;
  email: string;
  telefone?: string;
  endereco?: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
  };
}

interface CustomerAsaas {
  id: string;
}

interface ListaCustomersAsaas {
  data: CustomerAsaas[];
}

/**
 * Busca um customer existente pelo CPF/CNPJ; se não existir, cria um novo.
 * O Asaas exige um customer cadastrado antes de gerar qualquer cobrança.
 */
export async function buscarOuCriarClienteAsaas(
  dados: DadosClienteAsaas,
): Promise<ResultadoAsaas<{ customerId: string }>> {
  const documentoLimpo = dados.documento.replace(/\D/g, "");

  const busca = await chamarAsaas<ListaCustomersAsaas>(
    `/customers?cpfCnpj=${documentoLimpo}`,
  );

  if (busca.sucesso && busca.dados.data.length > 0) {
    return { sucesso: true, dados: { customerId: busca.dados.data[0].id } };
  }

  const criacao = await chamarAsaas<CustomerAsaas>("/customers", {
    method: "POST",
    body: {
      name: dados.nome,
      cpfCnpj: documentoLimpo,
      email: dados.email,
      mobilePhone: dados.telefone?.replace(/\D/g, "") || undefined,
      postalCode: dados.endereco?.cep.replace(/\D/g, ""),
      addressNumber: dados.endereco?.numero,
      complement: dados.endereco?.complemento || undefined,
    },
  });

  if (!criacao.sucesso) {
    return criacao;
  }

  return { sucesso: true, dados: { customerId: criacao.dados.id } };
}

// ---------------------------------------------------------------------------
// Cobrança (payment) no Asaas
// ---------------------------------------------------------------------------

export type BillingTypeAsaas = "PIX" | "BOLETO" | "CREDIT_CARD";

export interface DadosCartao {
  numero: string;
  nomeImpresso: string;
  mesValidade: string;
  anoValidade: string;
  cvv: string;
}

export interface DadosTitularCartao {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cep: string;
  /** Número do endereço do titular — reaproveitado do endereço de entrega. */
  numeroEndereco: string;
}

export interface CriarCobrancaInput {
  customerId: string;
  referenciaExterna?: string;
  billingType: BillingTypeAsaas;
  valor: number;
  descricao: string;
  /** IP de quem está pagando — exigido pelo Asaas em cobranças de cartão para antifraude. */
  ipCliente?: string;
  cartao?: DadosCartao;
  titularCartao?: DadosTitularCartao;
}

export interface CobrancaAsaas {
  id: string;
  status: string;
  bankSlipUrl?: string;
  invoiceUrl?: string;
}

function formatarDataAsaas(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export async function criarCobrancaAsaas(
  input: CriarCobrancaInput,
): Promise<ResultadoAsaas<CobrancaAsaas>> {
  const hoje = new Date();
  const vencimento =
    input.billingType === "BOLETO"
      ? new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000)
      : new Date(hoje.getTime() + 24 * 60 * 60 * 1000);

  const corpo: Record<string, unknown> = {
    customer: input.customerId,
    billingType: input.billingType,
    value: Number(input.valor.toFixed(2)),
    dueDate: formatarDataAsaas(vencimento),
    description: input.descricao,
    externalReference: input.referenciaExterna,
  };

  if (
    input.billingType === "CREDIT_CARD" &&
    (input.cartao || input.titularCartao)
  ) {
    if (!input.cartao || !input.titularCartao) {
      return { sucesso: false, mensagem: "Dados do cartão incompletos." };
    }

    corpo.creditCard = {
      holderName: input.cartao.nomeImpresso,
      number: input.cartao.numero.replace(/\D/g, ""),
      expiryMonth: input.cartao.mesValidade.padStart(2, "0"),
      expiryYear: input.cartao.anoValidade,
      ccv: input.cartao.cvv,
    };
    corpo.creditCardHolderInfo = {
      name: input.titularCartao.nome,
      email: input.titularCartao.email,
      cpfCnpj: input.titularCartao.cpf.replace(/\D/g, ""),
      postalCode: input.titularCartao.cep.replace(/\D/g, ""),
      addressNumber: input.titularCartao.numeroEndereco,
      phone: input.titularCartao.telefone.replace(/\D/g, ""),
    };
    if (input.ipCliente) {
      corpo.remoteIp = input.ipCliente;
    }
  }

  try {
    const resultado = await chamarAsaas<CobrancaAsaas>("/payments", {
      method: "POST",
      body: corpo,
    });
    return filtrarCobranca(resultado);
  } finally {
    delete corpo.creditCard;
    delete corpo.creditCardHolderInfo;
  }
}

// Não propagar creditCardToken, número mascarado nem campos extras do provedor.
function filtrarCobranca(
  resultado: ResultadoAsaas<CobrancaAsaas>,
): ResultadoAsaas<CobrancaAsaas> {
  if (!resultado.sucesso) return resultado;
  const d = resultado.dados;
  if (
    !d ||
    typeof d.id !== "string" ||
    !/^pay_[a-zA-Z0-9_-]+$/.test(d.id) ||
    typeof d.status !== "string" ||
    !/^[A-Z_]{1,50}$/.test(d.status)
  ) {
    return {
      sucesso: false,
      mensagem: "Não foi possível confirmar a resposta do pagamento.",
    };
  }
  const linkAsaas = (valor: unknown) => {
    if (typeof valor !== "string") return undefined;
    try {
      const u = new URL(valor);
      return u.protocol === "https:" &&
        (u.hostname === "asaas.com" || u.hostname.endsWith(".asaas.com")) &&
        !u.username &&
        !u.password
        ? u.href
        : undefined;
    } catch {
      return undefined;
    }
  };
  return {
    sucesso: true,
    dados: {
      id: d.id,
      status: d.status,
      ...(linkAsaas(d.bankSlipUrl)
        ? { bankSlipUrl: linkAsaas(d.bankSlipUrl) }
        : {}),
      ...(linkAsaas(d.invoiceUrl)
        ? { invoiceUrl: linkAsaas(d.invoiceUrl) }
        : {}),
    },
  };
}

/** Consulta o status atual de uma cobrança (usado no polling do Pix e no webhook). */
export async function consultarCobrancaAsaas(
  paymentId: string,
): Promise<ResultadoAsaas<CobrancaAsaas>> {
  return filtrarCobranca(
    await chamarAsaas<CobrancaAsaas>(
      `/payments/${encodeURIComponent(paymentId)}`,
    ),
  );
}

// ---------------------------------------------------------------------------
// Pix — QR Code
// ---------------------------------------------------------------------------

export interface PixQrCodeAsaas {
  encodedImage: string;
  payload: string;
}

export async function buscarQrCodePixAsaas(
  paymentId: string,
): Promise<ResultadoAsaas<{ qrCodeBase64: string; copiaECola: string }>> {
  const resultado = await chamarAsaas<PixQrCodeAsaas>(
    `/payments/${encodeURIComponent(paymentId)}/pixQrCode`,
  );

  if (!resultado.sucesso) return resultado;

  return {
    sucesso: true,
    dados: {
      qrCodeBase64: resultado.dados.encodedImage,
      copiaECola: resultado.dados.payload,
    },
  };
}

// ---------------------------------------------------------------------------
// Boleto — linha digitável
// ---------------------------------------------------------------------------

interface LinhaDigitavelAsaas {
  identificationField: string;
}

/**
 * A linha digitável não vem na resposta de criação da cobrança — é preciso
 * buscá-la à parte, como o QR Code do Pix. Se essa consulta falhar, quem
 * chamou ainda tem o `bankSlipUrl` (link do PDF do boleto) como alternativa.
 */
export async function buscarLinhaDigitavelBoletoAsaas(
  paymentId: string,
): Promise<ResultadoAsaas<{ linhaDigitavel: string }>> {
  const resultado = await chamarAsaas<LinhaDigitavelAsaas>(
    `/payments/${encodeURIComponent(paymentId)}/identificationField`,
  );

  if (!resultado.sucesso) return resultado;

  return {
    sucesso: true,
    dados: { linhaDigitavel: resultado.dados.identificationField },
  };
}
