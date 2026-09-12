// Cookie de liberação do modo construção. Só Web Crypto (sem node:crypto e
// sem "server-only"): roda no proxy e nos testes do mesmo jeito.
//
// Formato do cookie: "v1.<expira em segundos>.<HMAC-SHA256 em base64url>".
// O cookie NÃO contém a senha: contém só a data de expiração e uma
// assinatura calculada com MAINTENANCE_SECRET sobre essa data e sobre uma
// impressão (hash) da senha atual. Consequências:
//   - sem o segredo, não dá para fabricar nem estender um cookie;
//   - trocar MAINTENANCE_PASSWORD ou MAINTENANCE_SECRET invalida todos os
//     cookies já emitidos (é assim que se revoga o acesso);
//   - a validade é conferida no servidor, não pelo Max-Age do navegador.

import type { CredenciaisManutencao } from "@/lib/config/lancamento";

export const COOKIE_LIBERACAO_MANUTENCAO = "fhezo_manutencao";
export const DURACAO_LIBERACAO_SEGUNDOS = 7 * 24 * 60 * 60;

const VERSAO_TOKEN = "v1";
const TAMANHO_MAXIMO_TOKEN = 200;
const TAMANHO_MAXIMO_SENHA_DIGITADA = 1024;
const codificador = new TextEncoder();

async function chaveHmac(segredo: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", codificador.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

async function assinar(chave: CryptoKey, mensagem: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign("HMAC", chave, codificador.encode(mensagem)));
}

async function impressaoSenha(senha: string): Promise<string> {
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", codificador.encode("fhezo-manutencao|senha|" + senha)),
  );
  return Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function mensagemToken(expira: number, senha: string): Promise<string> {
  return `fhezo-manutencao|${VERSAO_TOKEN}|${expira}|${await impressaoSenha(senha)}`;
}

function paraBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** 32 bytes (SHA-256) = exatamente 43 caracteres base64url; qualquer outra coisa é recusada. */
function deBase64Url(texto: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]{43}$/.test(texto)) return null;
  const binario = atob(texto.replace(/-/g, "+").replace(/_/g, "/") + "=");
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}

export async function criarTokenLiberacao(credenciais: CredenciaisManutencao, agoraMs: number): Promise<string> {
  const expira = Math.floor(agoraMs / 1000) + DURACAO_LIBERACAO_SEGUNDOS;
  const assinatura = await assinar(await chaveHmac(credenciais.segredo), await mensagemToken(expira, credenciais.senha));
  return `${VERSAO_TOKEN}.${expira}.${paraBase64Url(assinatura)}`;
}

/** Qualquer problema (ausente, malformado, expirado, adulterado, credencial trocada) = false. */
export async function tokenLiberacaoValido(
  credenciais: CredenciaisManutencao | null,
  token: string | undefined,
  agoraMs: number,
): Promise<boolean> {
  if (!credenciais || !token || token.length > TAMANHO_MAXIMO_TOKEN) return false;

  const partes = token.split(".");
  if (partes.length !== 3 || partes[0] !== VERSAO_TOKEN || !/^\d{1,12}$/.test(partes[1])) return false;

  const expira = Number(partes[1]);
  const agora = Math.floor(agoraMs / 1000);
  // Expiração no futuro distante também é recusada: um token legítimo nunca
  // vale mais que DURACAO_LIBERACAO_SEGUNDOS a partir de agora.
  if (expira <= agora || expira - agora > DURACAO_LIBERACAO_SEGUNDOS) return false;

  const assinatura = deBase64Url(partes[2]);
  if (!assinatura) return false;

  // crypto.subtle.verify compara em tempo constante.
  return crypto.subtle.verify(
    "HMAC",
    await chaveHmac(credenciais.segredo),
    assinatura as Uint8Array<ArrayBuffer>,
    codificador.encode(await mensagemToken(expira, credenciais.senha)),
  );
}

/**
 * Compara a senha digitada com MAINTENANCE_PASSWORD em tempo constante: as
 * duas passam por HMAC (tamanho fixo de 32 bytes) antes da comparação, então
 * nem o tamanho nem o conteúdo vazam pelo tempo de resposta.
 */
export async function senhaManutencaoConfere(
  credenciais: CredenciaisManutencao | null,
  senhaDigitada: unknown,
): Promise<boolean> {
  if (!credenciais || typeof senhaDigitada !== "string") return false;
  if (senhaDigitada.length === 0 || senhaDigitada.length > TAMANHO_MAXIMO_SENHA_DIGITADA) return false;

  const chave = await chaveHmac(credenciais.segredo);
  const [digitada, esperada] = await Promise.all([
    assinar(chave, "comparar-senha|" + senhaDigitada),
    assinar(chave, "comparar-senha|" + credenciais.senha),
  ]);

  let diferenca = 0;
  for (let i = 0; i < esperada.length; i++) diferenca |= digitada[i] ^ esperada[i];
  return diferenca === 0;
}
