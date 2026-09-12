// Regras de ambiente das integrações de pagamento (Asaas) e frete (Melhor
// Envio) — APPSEC-028. Funções puras, sem "server-only" e sem dependências,
// de propósito: este arquivo também é importado pelo next.config.ts, para um
// deploy na Vercel com a combinação errada falhar já no build.
//
// Regra única:
//   deploy "production"                → integrações em "production"
//   deploy "preview" e "development"   → integrações em "sandbox"
//
// Nada é deduzido nem tem valor padrão: cada integração declara o próprio
// ambiente numa variável explícita (ASAAS_ENV, MELHOR_ENVIO_ENV), e qualquer
// valor diferente de exatamente "sandbox" ou "production" é erro.

export type AmbienteIntegracao = "sandbox" | "production";
export type AmbienteDeploy = "production" | "preview" | "development";
export type VariavelAmbienteIntegracao = "ASAAS_ENV" | "MELHOR_ENVIO_ENV";

type VariaveisAmbiente = Record<string, string | undefined>;

export class ErroConfiguracaoAmbiente extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroConfiguracaoAmbiente";
  }
}

/**
 * VERCEL_ENV é definida pela própria Vercel em todo deploy. Fora da Vercel
 * (máquina local) ela não existe, e o ambiente é "development".
 */
export function lerAmbienteDeploy(env: VariaveisAmbiente): AmbienteDeploy {
  const valor = env.VERCEL_ENV;
  if (valor === undefined || valor === "") return "development";
  if (valor === "production" || valor === "preview" || valor === "development") return valor;
  throw new ErroConfiguracaoAmbiente("VERCEL_ENV tem um valor desconhecido.");
}

/** Lê ASAAS_ENV / MELHOR_ENVIO_ENV sem aceitar nada além de "sandbox" ou "production". */
export function lerAmbienteIntegracao(env: VariaveisAmbiente, variavel: VariavelAmbienteIntegracao): AmbienteIntegracao {
  const valor = env[variavel];
  if (valor === "sandbox" || valor === "production") return valor;

  // O valor recebido não é repetido na mensagem: se alguém colar uma chave de
  // API na variável errada, ela não vai parar no log.
  throw new ErroConfiguracaoAmbiente(
    valor === undefined || valor === ""
      ? `${variavel} não está definida. Use exatamente "sandbox" ou "production".`
      : `${variavel} tem um valor inválido. Use exatamente "sandbox" ou "production".`,
  );
}

export function ambienteExigidoPara(deploy: AmbienteDeploy): AmbienteIntegracao {
  return deploy === "production" ? "production" : "sandbox";
}

/** Ambiente da integração, já conferido contra o ambiente do deploy. */
export function lerAmbienteIntegracaoValidado(
  env: VariaveisAmbiente,
  variavel: VariavelAmbienteIntegracao,
): AmbienteIntegracao {
  const deploy = lerAmbienteDeploy(env);
  const ambiente = lerAmbienteIntegracao(env, variavel);
  const exigido = ambienteExigidoPara(deploy);

  if (ambiente !== exigido) {
    throw new ErroConfiguracaoAmbiente(
      `${variavel}="${ambiente}" não é permitido num deploy "${deploy}": este ambiente exige "${exigido}".`,
    );
  }
  return ambiente;
}

/**
 * As chaves de API do Asaas no formato atual trazem o ambiente no prefixo
 * ("$aact_prod_…" produção, "$aact_hmlg_…" sandbox/homologação). Chaves sem
 * um desses prefixos não permitem saber o ambiente — aí vale só ASAAS_ENV.
 */
export function ambienteDaChaveAsaas(chave: string): AmbienteIntegracao | null {
  if (chave.startsWith("$aact_prod_")) return "production";
  if (chave.startsWith("$aact_hmlg_")) return "sandbox";
  return null;
}

/** Recusa uma chave cujo prefixo indica o ambiente oposto ao declarado em ASAAS_ENV. */
export function validarChaveAsaasParaAmbiente(chave: string, ambiente: AmbienteIntegracao): void {
  const ambienteDaChave = ambienteDaChaveAsaas(chave);
  if (ambienteDaChave !== null && ambienteDaChave !== ambiente) {
    throw new ErroConfiguracaoAmbiente(
      `A ASAAS_API_KEY configurada é de "${ambienteDaChave}", mas ASAAS_ENV é "${ambiente}".`,
    );
  }
}

/**
 * Validação completa, usada no build (next.config.ts) — lança na primeira
 * combinação inválida. A chave do Asaas só é conferida se estiver presente
 * (ausente é tratada em tempo de execução, por obterConfigAsaas).
 */
export function validarAmbientesIntegracoes(env: VariaveisAmbiente): {
  deploy: AmbienteDeploy;
  asaas: AmbienteIntegracao;
  melhorEnvio: AmbienteIntegracao;
} {
  const deploy = lerAmbienteDeploy(env);
  const asaas = lerAmbienteIntegracaoValidado(env, "ASAAS_ENV");
  const melhorEnvio = lerAmbienteIntegracaoValidado(env, "MELHOR_ENVIO_ENV");
  if (env.ASAAS_API_KEY) validarChaveAsaasParaAmbiente(env.ASAAS_API_KEY, asaas);
  return { deploy, asaas, melhorEnvio };
}
