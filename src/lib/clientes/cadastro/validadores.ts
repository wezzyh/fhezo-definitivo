// Validadores puros do cadastro de cliente — sem zod, sem React. Recebem
// string (com ou sem máscara) e respondem boolean/número, para poderem ser
// usados tanto nos esquemas (cliente e servidor) quanto nos testes.
// CPF/CNPJ ficam em src/lib/checkout/validar-documento.ts (já usados pelo
// checkout) — não duplicar aqui.

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

// DDDs em uso no Brasil (Anatel). Números como 20, 23, 25, 26, 29, 30, 36,
// 39, 40, 50, 52, 56–60, 70, 72, 76, 78, 80 e 90 não existem — sem esta
// lista, "(00) 90000-0000" passaria na validação só por ter 11 dígitos.
const DDDS_VALIDOS = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
]);

/** Celular: DDD válido + 9 dígitos começando por 9. */
export function validarCelular(valor: string): boolean {
  const numeros = apenasDigitos(valor);
  return numeros.length === 11 && DDDS_VALIDOS.has(numeros.slice(0, 2)) && numeros[2] === "9";
}

/** Telefone comercial: fixo (DDD + 8 dígitos começando de 2 a 5) ou celular. */
export function validarTelefone(valor: string): boolean {
  const numeros = apenasDigitos(valor);
  if (numeros.length === 11) return validarCelular(numeros);
  return numeros.length === 10 && DDDS_VALIDOS.has(numeros.slice(0, 2)) && /[2-5]/.test(numeros[2]);
}

export function validarCep(valor: string): boolean {
  const numeros = apenasDigitos(valor);
  return numeros.length === 8 && numeros !== "00000000";
}

/**
 * Nome e sobrenome: pelo menos duas palavras com 2+ letras cada ("Maria da
 * Silva" passa — o "da" não conta, mas também não atrapalha). Só letras
 * (com acento), espaço, apóstrofo, hífen e ponto.
 */
export function validarNomeCompleto(valor: string): boolean {
  const nome = valor.trim();
  if (!/^[\p{L}\s'.-]+$/u.test(nome)) return false;
  const palavrasComDuasLetras = nome
    .split(/\s+/)
    .filter((palavra) => palavra.replace(/[^\p{L}]/gu, "").length >= 2);
  return palavrasComDuasLetras.length >= 2;
}

/**
 * Idade em anos completos a partir de uma data "AAAA-MM-DD" (formato do
 * <input type="date">). Devolve null para data inexistente (ex.: 31/02).
 * Quem nasceu em 29/02 completa ano em 01/03 nos anos não bissextos.
 * `hoje` é parâmetro para os testes poderem fixar a data.
 */
export function calcularIdade(dataIso: string, hoje: Date = new Date()): number | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataIso);
  if (!partes) return null;

  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    return null;
  }

  const mesHoje = hoje.getMonth() + 1;
  const aindaNaoFezAniversario = mesHoje < mes || (mesHoje === mes && hoje.getDate() < dia);
  return hoje.getFullYear() - ano - (aindaNaoFezAniversario ? 1 : 0);
}
