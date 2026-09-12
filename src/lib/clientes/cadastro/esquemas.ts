// Esquemas Zod do cadastro de cliente em etapas (/cadastro). Os MESMOS
// esquemas rodam no navegador (usabilidade: erro campo a campo, etapa por
// etapa) e na Server Action (segurança: nada vindo do cliente é confiável).
//
// Organização:
// - um esquema por grupo de campos (acesso, identificação PF/PJ, fiscal,
//   endereço) — os campos do formulário ficam aninhados nesses grupos;
// - `esquemaDaEtapa`: o que é validado ao tentar avançar de cada etapa;
// - `esquemaCadastro`: o esquema final, discriminado por "tipo" (PF | PJ),
//   usado na revisão e revalidado inteiro no servidor.
//
// Limites de tamanho seguem o layout da NF-e 4.0 (nome/razão social,
// logradouro, bairro, município etc. até 60 caracteres), que é o que o
// Bling transmite à SEFAZ — um nome maior seria cortado ou recusado lá.

import { z } from "zod";
import { validarCNPJ, validarCPF } from "@/lib/checkout/validar-documento";
import type { TipoPessoa } from "@/types/database";
import { SENHA_MIN, ehSenhaComum, senhaCabeNoLimite } from "./senha";
import {
  CONTRIBUINTE_ICMS,
  FINALIDADES_COMPRA,
  REGIMES_TRIBUTARIOS,
  UFS,
  ehUf,
  formatoIeAceitavel,
  regraInscricaoEstadual,
  ufTemSuframa,
  validarInscricaoEstadual,
  validarInscricaoSuframa,
  type ContribuinteIcms,
  type FinalidadeCompra,
  type RegimeTributario,
  type Uf,
} from "./regras-fiscais";
import { calcularIdade, validarCelular, validarCep, validarNomeCompleto, validarTelefone } from "./validadores";

export const IDADE_MINIMA = 18;
const IDADE_MAXIMA = 120;

/**
 * Campo de texto obrigatório. Validações de formato encadeadas depois dele
 * ignoram valor vazio (`!valor || validarX(valor)`), para "vazio" ser o
 * único erro mostrado enquanto o campo estiver vazio.
 *
 * Não use `abort: true` para isso: no zod 4 ele interrompe o OBJETO
 * inteiro, e os refinamentos do grupo (ex.: "Informe o número") deixam de
 * rodar — inclusive os que têm `when` (conferido no zod 4.5.4).
 */
function obrigatorio(mensagem: string, maximo: number) {
  return z
    .string()
    .trim()
    .min(1, { error: mensagem })
    .max(maximo, { error: `Use no máximo ${maximo} caracteres.` });
}

function opcional(maximo: number) {
  return z.string().trim().max(maximo, { error: `Use no máximo ${maximo} caracteres.` });
}

/**
 * No zod 4, o refinamento de um objeto é pulado por padrão quando algum
 * campo dele teve erro de tipo. Nas etapas isso esconderia regras do grupo
 * até os outros campos estarem corretos — com isto, a etapa mostra todos os
 * erros de uma vez. Por isso toda função de refinamento que usa isto
 * confere os tipos antes de ler os valores. O esquema final (revalidado no
 * servidor, entrada não confiável) NÃO usa: lá, com dado malformado, a
 * regra cruzada nem roda.
 */
const mesmoComOutrosErros = { when: () => true };

const tipoPessoa = z.enum(["PF", "PJ"], { error: "Escolha pessoa física ou jurídica." });

// ---------------------------------------------------------------------------
// Etapa 1 — acesso
// ---------------------------------------------------------------------------

export const esquemaAcesso = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, { error: "Informe seu e-mail." })
      .max(254, { error: "E-mail longo demais." })
      .pipe(z.email({ error: "E-mail inválido. Confira se digitou certo." })),
    senha: z
      .string()
      .min(SENHA_MIN, { error: `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.` })
      .refine(senhaCabeNoLimite, { error: "Senha longa demais — use no máximo 72 caracteres." })
      // Só a partir do mínimo: "1234" já tem o erro de tamanho, não precisa de dois.
      .refine((senha) => senha.length < SENHA_MIN || !ehSenhaComum(senha), {
        error: "Essa senha é muito comum e fácil de adivinhar. Escolha outra.",
      }),
    confirmacaoSenha: z.string().min(1, { error: "Repita a senha." }),
  })
  .superRefine((valores, ctx) => {
    if (typeof valores.senha !== "string" || typeof valores.confirmacaoSenha !== "string") return;

    if (valores.confirmacaoSenha && valores.senha !== valores.confirmacaoSenha) {
      ctx.addIssue({ code: "custom", message: "As senhas não conferem.", path: ["confirmacaoSenha"] });
    }

    const usuarioEmail = typeof valores.email === "string" ? valores.email.split("@")[0].toLowerCase() : "";
    if (usuarioEmail.length >= 4 && valores.senha.toLowerCase().includes(usuarioEmail)) {
      ctx.addIssue({ code: "custom", message: "A senha não pode conter o seu e-mail.", path: ["senha"] });
    }
  }, mesmoComOutrosErros);

// ---------------------------------------------------------------------------
// Etapa 2 — identificação
// ---------------------------------------------------------------------------

export const esquemaIdentificacaoPF = z.object({
  nomeCompleto: obrigatorio("Informe seu nome completo.", 60).refine((valor) => !valor || validarNomeCompleto(valor), {
    error: "Informe nome e sobrenome.",
  }),
  cpf: obrigatorio("Informe seu CPF.", 14).refine((valor) => !valor || validarCPF(valor), { error: "CPF inválido. Confira os números." }),
  dataNascimento: z
    .string()
    .min(1, { error: "Informe sua data de nascimento." })
    .superRefine((valor, ctx) => {
      if (!valor) return;
      const idade = calcularIdade(valor);
      if (idade === null || idade < 0 || idade > IDADE_MAXIMA) {
        ctx.addIssue({ code: "custom", message: "Data de nascimento inválida." });
      } else if (idade < IDADE_MINIMA) {
        ctx.addIssue({ code: "custom", message: `É preciso ter ${IDADE_MINIMA} anos ou mais para criar uma conta.` });
      }
    }),
  celular: obrigatorio("Informe seu celular.", 16).refine((valor) => !valor || validarCelular(valor), {
    error: "Celular inválido. Use DDD + 9 dígitos, ex.: (11) 91234-5678.",
  }),
});

export const esquemaIdentificacaoPJ = z
  .object({
    razaoSocial: obrigatorio("Informe a razão social.", 60),
    nomeFantasia: opcional(60),
    cnpj: obrigatorio("Informe o CNPJ.", 18).refine((valor) => !valor || validarCNPJ(valor), { error: "CNPJ inválido. Confira os números." }),
    // Opcional nesta etapa: quem a torna obrigatória é "Contribuinte de
    // ICMS = Sim" (etapa 3) — ver regraInscricaoEstadual. A regra do
    // dígito verificador por UF só roda na etapa 4, quando há UF.
    inscricaoEstadual: opcional(20),
    ieIsento: z.boolean(),
    telefoneComercial: obrigatorio("Informe o telefone comercial.", 16).refine((valor) => !valor || validarTelefone(valor), {
      error: "Telefone inválido. Use DDD + número, ex.: (11) 3456-7890.",
    }),
    responsavelNome: obrigatorio("Informe o nome do responsável pela conta.", 60).refine((valor) => !valor || validarNomeCompleto(valor), {
      error: "Informe nome e sobrenome do responsável.",
    }),
  })
  .superRefine((valores, ctx) => {
    const ie = typeof valores.inscricaoEstadual === "string" ? valores.inscricaoEstadual.trim() : "";
    if (!valores.ieIsento && ie && !formatoIeAceitavel(ie)) {
      ctx.addIssue({
        code: "custom",
        message: "Inscrição estadual inválida. Use só os números.",
        path: ["inscricaoEstadual"],
      });
    }
  }, mesmoComOutrosErros);

// ---------------------------------------------------------------------------
// Etapa 3 — dados fiscais (só PJ)
// ---------------------------------------------------------------------------

export const esquemaDadosFiscais = z.object({
  contribuinteIcms: z.enum(CONTRIBUINTE_ICMS, { error: "Informe se a empresa é contribuinte de ICMS." }),
  finalidadeCompra: z.enum(FINALIDADES_COMPRA, { error: "Informe a finalidade da compra." }),
  regimeTributario: z.enum(REGIMES_TRIBUTARIOS, { error: "Informe o regime tributário." }),
  inscricaoMunicipal: opcional(15).refine((valor) => !valor || /^[A-Za-z0-9./-]+$/.test(valor), {
    error: "Inscrição municipal inválida. Use letras, números, ponto, barra ou hífen.",
  }),
  // Aparece na etapa 4 (depende da UF do endereço) — o formato é checado lá,
  // em problemasSuframa, e só quando o campo está visível.
  inscricaoSuframa: z.string().trim(),
});

// ---------------------------------------------------------------------------
// Etapa 4 — endereço
// ---------------------------------------------------------------------------

export const esquemaEndereco = z
  .object({
    cep: obrigatorio("Informe o CEP.", 9).refine((valor) => !valor || validarCep(valor), { error: "CEP inválido." }),
    logradouro: obrigatorio("Informe a rua.", 60),
    numero: opcional(60),
    semNumero: z.boolean(),
    complemento: opcional(60),
    referencia: opcional(100),
    bairro: obrigatorio("Informe o bairro.", 60),
    cidade: obrigatorio("Informe a cidade.", 60),
    uf: z.enum(UFS, { error: "Selecione o estado." }),
  })
  .superRefine((valores, ctx) => {
    const numero = typeof valores.numero === "string" ? valores.numero.trim() : "";
    if (!valores.semNumero && !numero) {
      ctx.addIssue({
        code: "custom",
        message: "Informe o número ou marque “Sem número”.",
        path: ["numero"],
      });
    }
  }, mesmoComOutrosErros);

/** Endereço sem exigência nenhuma — forma do bloco de entrega quando ele está oculto. */
const esquemaEnderecoLivre = z.object({
  cep: z.string(),
  logradouro: z.string(),
  numero: z.string(),
  semNumero: z.boolean(),
  complemento: z.string(),
  referencia: z.string(),
  bairro: z.string(),
  cidade: z.string(),
  uf: z.string(),
});

// ---------------------------------------------------------------------------
// Regras que cruzam etapas
// ---------------------------------------------------------------------------

export interface Problema {
  caminho: PropertyKey[];
  mensagem: string;
}

/** Bloco de entrega só é validado quando "entrega diferente da cobrança" está marcado. */
export function problemasEnderecoEntrega(entregaDiferente: boolean, entrega: unknown): Problema[] {
  if (!entregaDiferente) return [];
  const resultado = esquemaEndereco.safeParse(entrega);
  if (resultado.success) return [];
  return resultado.error.issues.map((issue) => ({ caminho: ["entrega", ...issue.path], mensagem: issue.message }));
}

/**
 * Inscrição Estadual conforme Contribuinte de ICMS (etapa 3) e, quando a UF
 * já é conhecida (etapa 4 em diante), conforme a regra da UF. O erro é
 * sempre no campo da etapa 2 (pj.inscricaoEstadual) — a tela decide como
 * levar o usuário até ele.
 */
export function problemasInscricaoEstadual(dados: {
  inscricaoEstadual: string;
  ieIsento: boolean;
  contribuinte: ContribuinteIcms | "" | undefined;
  uf?: string;
}): Problema[] {
  const caminho = ["pj", "inscricaoEstadual"];
  const ie = typeof dados.inscricaoEstadual === "string" ? dados.inscricaoEstadual.trim() : "";
  const regra = regraInscricaoEstadual(dados.contribuinte);

  if (regra.obrigatoria && (dados.ieIsento || !ie)) {
    return [{ caminho, mensagem: "Contribuinte de ICMS precisa informar a inscrição estadual." }];
  }
  if (regra.checkboxIsento === "travado_marcado" && ie) {
    return [{ caminho, mensagem: "Empresa isenta de inscrição estadual não deve informar o número." }];
  }
  if (ie && !dados.ieIsento && dados.uf && ehUf(dados.uf) && !validarInscricaoEstadual(ie, dados.uf)) {
    return [
      {
        caminho,
        mensagem: `Inscrição estadual inválida para ${dados.uf}. Confira o número ou o estado do endereço.`,
      },
    ];
  }
  return [];
}

export function problemasSuframa(inscricaoSuframa: string, uf: string): Problema[] {
  if (typeof inscricaoSuframa !== "string" || typeof uf !== "string") return [];
  if (!ufTemSuframa(uf) || !inscricaoSuframa.trim() || validarInscricaoSuframa(inscricaoSuframa)) return [];
  return [{ caminho: ["fiscal", "inscricaoSuframa"], mensagem: "A inscrição SUFRAMA tem 9 números." }];
}

function problemasPJ(valores: {
  pj: { inscricaoEstadual: string; ieIsento: boolean };
  fiscal: { contribuinteIcms: ContribuinteIcms | ""; inscricaoSuframa: string };
  endereco: { uf: string };
}): Problema[] {
  return [
    ...problemasInscricaoEstadual({
      inscricaoEstadual: valores.pj.inscricaoEstadual,
      ieIsento: valores.pj.ieIsento,
      contribuinte: valores.fiscal.contribuinteIcms,
      uf: valores.endereco.uf,
    }),
    ...problemasSuframa(valores.fiscal.inscricaoSuframa, valores.endereco.uf),
  ];
}

// ---------------------------------------------------------------------------
// Esquema final — discriminado por tipo de pessoa
// ---------------------------------------------------------------------------

const camposComuns = {
  acesso: esquemaAcesso,
  endereco: esquemaEndereco,
  entregaDiferente: z.boolean(),
  entrega: esquemaEnderecoLivre,
  aceiteTermos: z.literal(true, {
    error: "Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.",
  }),
  aceiteMarketing: z.boolean(),
};

export const esquemaCadastro = z
  .discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("PF"), pf: esquemaIdentificacaoPF, ...camposComuns }),
    z.object({ tipo: z.literal("PJ"), pj: esquemaIdentificacaoPJ, fiscal: esquemaDadosFiscais, ...camposComuns }),
  ])
  .superRefine((valores, ctx) => {
    const problemas = [
      ...problemasEnderecoEntrega(valores.entregaDiferente, valores.entrega),
      ...(valores.tipo === "PJ" && valores.pj && valores.fiscal && valores.endereco ? problemasPJ(valores) : []),
    ];
    for (const problema of problemas) {
      ctx.addIssue({ code: "custom", message: problema.mensagem, path: problema.caminho });
    }
  });

export type DadosCadastro = z.output<typeof esquemaCadastro>;

// ---------------------------------------------------------------------------
// Etapas
// ---------------------------------------------------------------------------

export type IdEtapa = "acesso" | "identificacao" | "fiscal" | "endereco" | "revisao";

/** Pessoa física não passa pela etapa fiscal: 4 etapas para PF, 5 para PJ. */
export function etapasDoTipo(tipo: TipoPessoa): IdEtapa[] {
  return tipo === "PJ"
    ? ["acesso", "identificacao", "fiscal", "endereco", "revisao"]
    : ["acesso", "identificacao", "endereco", "revisao"];
}

const esquemaEtapaFiscal = z
  .object({
    fiscal: esquemaDadosFiscais.omit({ inscricaoSuframa: true }),
    pj: z.object({ inscricaoEstadual: z.string(), ieIsento: z.boolean() }),
  })
  .superRefine((valores, ctx) => {
    if (!valores.fiscal || !valores.pj) return;
    const problemas = problemasInscricaoEstadual({
      inscricaoEstadual: valores.pj.inscricaoEstadual,
      ieIsento: valores.pj.ieIsento,
      contribuinte: valores.fiscal.contribuinteIcms,
    });
    for (const problema of problemas) {
      ctx.addIssue({ code: "custom", message: problema.mensagem, path: problema.caminho });
    }
  }, mesmoComOutrosErros);

const esquemaEtapaEndereco = z
  .object({
    tipo: tipoPessoa,
    endereco: esquemaEndereco,
    entregaDiferente: z.boolean(),
    entrega: esquemaEnderecoLivre,
    pj: z.object({ inscricaoEstadual: z.string(), ieIsento: z.boolean() }),
    fiscal: z.object({ contribuinteIcms: z.string(), inscricaoSuframa: z.string() }),
  })
  .superRefine((valores, ctx) => {
    const problemas = [...problemasEnderecoEntrega(valores.entregaDiferente, valores.entrega)];
    if (valores.tipo === "PJ" && valores.pj && valores.fiscal && valores.endereco) {
      problemas.push(
        ...problemasPJ({
          pj: valores.pj,
          fiscal: {
            contribuinteIcms: valores.fiscal.contribuinteIcms as ContribuinteIcms | "",
            inscricaoSuframa: valores.fiscal.inscricaoSuframa,
          },
          endereco: valores.endereco,
        }),
      );
    }
    for (const problema of problemas) {
      ctx.addIssue({ code: "custom", message: problema.mensagem, path: problema.caminho });
    }
  }, mesmoComOutrosErros);

/**
 * O que é validado ao tentar sair de cada etapa. Os campos de outras
 * etapas não entram (senão um campo ainda não preenchido da etapa 4
 * travaria a etapa 1). A revisão valida o cadastro inteiro.
 */
export const esquemaDaEtapa: Record<IdEtapa, z.ZodType> = {
  acesso: z.object({ tipo: tipoPessoa, acesso: esquemaAcesso }),
  identificacao: z.discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("PF"), pf: esquemaIdentificacaoPF }),
    z.object({ tipo: z.literal("PJ"), pj: esquemaIdentificacaoPJ }),
  ]),
  fiscal: esquemaEtapaFiscal,
  endereco: esquemaEtapaEndereco,
  revisao: esquemaCadastro,
};

/**
 * A qual etapa pertence um campo com erro — para a revisão (e o erro
 * vindo do servidor) levarem o usuário direto à etapa certa.
 */
export function etapaDoCampo(caminho: readonly PropertyKey[]): IdEtapa {
  const [grupo, campo] = caminho;
  if (grupo === "tipo" || grupo === "acesso") return "acesso";
  if (grupo === "pf" || grupo === "pj") return "identificacao";
  if (grupo === "fiscal") return campo === "inscricaoSuframa" ? "endereco" : "fiscal";
  if (grupo === "endereco" || grupo === "entrega" || grupo === "entregaDiferente") return "endereco";
  return "revisao";
}

// ---------------------------------------------------------------------------
// Valores do formulário (react-hook-form)
// ---------------------------------------------------------------------------

export interface ValoresEndereco {
  cep: string;
  logradouro: string;
  numero: string;
  semNumero: boolean;
  complemento: string;
  referencia: string;
  bairro: string;
  cidade: string;
  uf: Uf | "";
}

/**
 * Estado do formulário inteiro. Os grupos PF e PJ existem ao mesmo tempo
 * (trocar o tipo não apaga o que já foi digitado no outro); o "tipo"
 * decide qual conta — o esquema final descarta o grupo que não se aplica.
 * Selects começam em "" (nada escolhido), o que o esquema recusa.
 */
export interface ValoresFormularioCadastro {
  tipo: TipoPessoa;
  acesso: { email: string; senha: string; confirmacaoSenha: string };
  pf: { nomeCompleto: string; cpf: string; dataNascimento: string; celular: string };
  pj: {
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    inscricaoEstadual: string;
    ieIsento: boolean;
    telefoneComercial: string;
    responsavelNome: string;
  };
  fiscal: {
    contribuinteIcms: ContribuinteIcms | "";
    finalidadeCompra: FinalidadeCompra | "";
    regimeTributario: RegimeTributario | "";
    inscricaoMunicipal: string;
    inscricaoSuframa: string;
  };
  endereco: ValoresEndereco;
  entregaDiferente: boolean;
  entrega: ValoresEndereco;
  aceiteTermos: boolean;
  aceiteMarketing: boolean;
}

const enderecoVazio: ValoresEndereco = {
  cep: "",
  logradouro: "",
  numero: "",
  semNumero: false,
  complemento: "",
  referencia: "",
  bairro: "",
  cidade: "",
  uf: "",
};

export const valoresIniciaisCadastro: ValoresFormularioCadastro = {
  tipo: "PF",
  acesso: { email: "", senha: "", confirmacaoSenha: "" },
  pf: { nomeCompleto: "", cpf: "", dataNascimento: "", celular: "" },
  pj: {
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    inscricaoEstadual: "",
    ieIsento: false,
    telefoneComercial: "",
    responsavelNome: "",
  },
  fiscal: {
    contribuinteIcms: "",
    finalidadeCompra: "",
    regimeTributario: "",
    inscricaoMunicipal: "",
    inscricaoSuframa: "",
  },
  endereco: enderecoVazio,
  entregaDiferente: false,
  entrega: enderecoVazio,
  // Marketing começa desmarcado de propósito (LGPD: consentimento não pode vir pré-marcado).
  aceiteTermos: false,
  aceiteMarketing: false,
};
