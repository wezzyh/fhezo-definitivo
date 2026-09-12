"use server";

import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { obterUrlBaseSite } from "@/lib/url-site";
import { destinoInterno } from "@/lib/url-interna";
import { esquemaCadastro } from "@/lib/clientes/cadastro/esquemas";
import { apenasDigitos } from "@/lib/clientes/cadastro/validadores";
import type { Cliente } from "@/types/database";

export interface EstadoFormularioCadastro {
  erro?: string;
  mensagemSucesso?: string;
}

export interface ResultadoCriacaoConta {
  /** Erro que não pertence a um campo específico. */
  erro?: string;
  /** Erros por campo ("pf.cpf" → mensagem) — o assistente leva o usuário à etapa do primeiro. */
  errosCampos?: Record<string, string>;
  /** Conta criada, mas o projeto exige confirmar o e-mail antes da primeira sessão. */
  confirmarEmail?: boolean;
  /** Conta criada e sessão aberta: para onde o navegador deve ir. */
  destino?: string;
}

const MENSAGEM_EMAIL_INDISPONIVEL =
  "Não foi possível criar a conta com este e-mail. Se você já tem conta, entre ou recupere sua senha.";

// Mesma resposta para "documento com conta" e "documento de compra antiga
// sem conta": não revela qual dos dois é.
const MENSAGEM_DOCUMENTO_CADASTRADO =
  "Este CPF/CNPJ já tem cadastro na loja. Se a conta é sua, entre ou recupere a senha. Se você comprou conosco sem criar conta, fale com o atendimento para recuperar o histórico.";

const MENSAGEM_ERRO_GENERICO = "Não foi possível criar sua conta agora. Tente novamente em instantes.";

/** O documento como pode estar gravado: só dígitos (padrão atual) ou com a máscara usual (registros antigos). */
function formasDoDocumento(digitos: string): string[] {
  if (digitos.length === 11) return [digitos, digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")];
  if (digitos.length === 14) return [digitos, digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")];
  return [digitos];
}

/**
 * Cria a conta a partir do assistente de cadastro (/cadastro). Recebe o
 * formulário inteiro e revalida TUDO com o mesmo esquema do navegador —
 * nada que chega aqui é confiável.
 *
 * Ainda grava só as colunas que "clientes" já tem (tipo, nome, documento,
 * e-mail, telefone, endereço). Nascimento, dados fiscais, endereço de
 * entrega e o registro do aceite dos termos dependem de colunas novas.
 *
 * Nada aqui é registrado em log: CPF/CNPJ e senha nunca saem desta função.
 */
export async function criarContaCliente(valores: unknown, proximo: string): Promise<ResultadoCriacaoConta> {
  const validacao = esquemaCadastro.safeParse(valores);
  if (!validacao.success) {
    const errosCampos: Record<string, string> = {};
    for (const issue of validacao.error.issues) {
      const caminho = issue.path.map(String).join(".");
      errosCampos[caminho] ??= issue.message;
    }
    return { errosCampos };
  }

  const dados = validacao.data;
  const ehPJ = dados.tipo === "PJ";
  const nome = ehPJ ? dados.pj.razaoSocial : dados.pf.nomeCompleto;
  const documento = apenasDigitos(ehPJ ? dados.pj.cnpj : dados.pf.cpf);
  const telefone = apenasDigitos(ehPJ ? dados.pj.telefoneComercial : dados.pf.celular);
  const email = dados.acesso.email;

  const supabaseAdmin = criarClienteSupabaseAdmin();
  const documentoJaCadastrado: ResultadoCriacaoConta = {
    errosCampos: { [ehPJ ? "pj.cnpj" : "pf.cpf"]: MENSAGEM_DOCUMENTO_CADASTRADO },
  };

  // APPSEC-003: um CPF/CNPJ que já existe em "clientes" — com conta OU de
  // uma compra antiga sem conta — nunca é assumido por um cadastro novo.
  // Saber o documento de alguém não prova ser essa pessoa, e assumir a
  // linha entregaria o histórico de pedidos e o endereço dela. Recuperar o
  // histórico de uma compra sem conta é um processo à parte, com
  // verificação pelo atendimento.
  // Checado ANTES do signUp: recusar depois deixaria um login órfão.
  const { data: existentes, error: erroBusca } = await supabaseAdmin
    .from("clientes")
    .select("id")
    .in("documento", formasDoDocumento(documento))
    .limit(1)
    .returns<Pick<Cliente, "id">[]>();

  if (erroBusca) return { erro: MENSAGEM_ERRO_GENERICO };
  if (existentes && existentes.length > 0) return documentoJaCadastrado;

  const supabase = await criarClienteSupabaseServidor();
  const urlBase = await obterUrlBaseSite();
  const destino = destinoInterno(proximo);

  // emailRedirectTo: ver comentário equivalente em reenviarConfirmacaoEmail.
  const { data, error } = await supabase.auth.signUp({
    email,
    password: dados.acesso.senha,
    options: { emailRedirectTo: `${urlBase}/auth/confirm?next=${encodeURIComponent(destino)}` },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.message === "User already registered") {
      return { erro: MENSAGEM_EMAIL_INDISPONIVEL };
    }
    if (error.code === "weak_password") {
      return { errosCampos: { "acesso.senha": "Essa senha não foi aceita. Escolha uma senha mais longa e menos óbvia." } };
    }
    // error.message não é repassado: não é texto pensado para o cliente.
    return { erro: MENSAGEM_ERRO_GENERICO };
  }

  // Com "Confirm email" ligado, o Supabase NÃO devolve erro para e-mail já
  // cadastrado: devolve um usuário fictício sem identidades (para não
  // revelar quem tem conta). Sem esta checagem, o id fictício seria
  // vinculado a um cliente logo abaixo.
  if (!data.user || (data.user.identities?.length ?? 0) === 0) {
    return { erro: MENSAGEM_EMAIL_INDISPONIVEL };
  }

  const dadosCliente = {
    tipo: dados.tipo,
    nome,
    email,
    telefone: telefone || null,
    auth_user_id: data.user.id,
    endereco_cep: apenasDigitos(dados.endereco.cep),
    endereco_rua: dados.endereco.logradouro,
    // "S/N" é a convenção da NF-e (e do Bling) para endereço sem número.
    endereco_numero: dados.endereco.semNumero ? "S/N" : dados.endereco.numero,
    endereco_complemento: dados.endereco.complemento || null,
    endereco_bairro: dados.endereco.bairro,
    endereco_cidade: dados.endereco.cidade,
    endereco_uf: dados.endereco.uf,
  };

  // Sempre uma linha NOVA — nunca update de uma linha existente (APPSEC-003).
  const { error: erroCliente } = await supabaseAdmin.from("clientes").insert({ ...dadosCliente, documento });
  if (erroCliente) {
    // Sem a linha em "clientes" o login ficaria órfão. O usuário acabou de
    // ser criado por ESTA chamada e não tem nada ligado a ele: desfaz, para
    // a pessoa poder tentar de novo. 23505 = outro cadastro com o mesmo
    // documento ganhou a corrida (índice único da migração 0034).
    try {
      if (data.session) await supabase.auth.signOut();
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    } catch {
      // Melhor esforço: a resposta ao cliente é a mesma.
    }
    return erroCliente.code === "23505" ? documentoJaCadastrado : { erro: MENSAGEM_ERRO_GENERICO };
  }

  if (!data.session) {
    return { confirmarEmail: true };
  }
  return { destino };
}

/**
 * Reenvia o e-mail de confirmação de cadastro. Existe porque o primeiro
 * e-mail se perde com frequência (spam, digitação errada percebida depois,
 * limite de envio do provedor) e, sem isto, a única saída seria o admin
 * confirmar a conta na mão pelo painel do Supabase.
 *
 * Não distingue "e-mail não cadastrado" de "e-mail já confirmado": responde
 * a mesma coisa nos dois casos, pelo mesmo motivo de
 * pedirRedefinicaoSenha — não entregar quem tem conta para quem ficar
 * testando endereços.
 */
export async function reenviarConfirmacaoEmail(
  _estadoAnterior: EstadoFormularioCadastro,
  formData: FormData,
): Promise<EstadoFormularioCadastro> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { erro: "Informe o e-mail para reenviar a confirmação." };
  }

  const supabase = await criarClienteSupabaseServidor();
  const urlBase = await obterUrlBaseSite();

  // emailRedirectTo manda o link de confirmação para ESTE site (rota
  // /auth/confirm, que troca o token por sessão) em vez de para a "Site
  // URL" genérica configurada no painel do Supabase. Sem isso, quem
  // confirma o e-mail cai na home sem sessão nenhuma e parece que nada
  // aconteceu. O destino precisa estar liberado em Supabase >
  // Authentication > URL Configuration > Redirect URLs.
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${urlBase}/auth/confirm?next=${encodeURIComponent("/conta")}` },
  });

  if (error) {
    return { erro: "Não foi possível reenviar agora. Tente de novo em alguns minutos." };
  }

  return { mensagemSucesso: "Reenviamos o e-mail de confirmação. Confira sua caixa de entrada e o spam." };
}
