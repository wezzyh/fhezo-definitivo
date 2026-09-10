// Deriva os hrefs de telefone/WhatsApp a partir do número digitado pelo
// admin em formato legível (ex.: "(51) 99351-56006") — evita pedir pra
// digitar o mesmo número duas vezes (uma "bonita", outra já em formato de
// link), que é como contato-fixo.ts funcionava antes (telefoneExibicao +
// telefoneTel como dois campos separados, risco de ficarem dessincronizados).
// Assume DDI 55 (Brasil) quando o número não já vem com "+" — único cenário
// real deste projeto (ver CONTATO_PADRAO).

function apenasDigitos(numero: string): string {
  return numero.replace(/\D/g, "");
}

/** "(51) 99351-56006" → "+5551993515606" (para href="tel:..."). Mantém um "+" já presente no início do texto digitado, para números internacionais. */
export function paraTelHref(numero: string): string {
  const comPrefixo = numero.trim().startsWith("+");
  const digitos = apenasDigitos(numero);
  return comPrefixo ? `+${digitos}` : `+55${digitos}`;
}

/**
 * "(51) 99351-56006" → "5551993515606" (para href="https://wa.me/..." —
 * sem "+", formato exigido pelo wa.me). Detecta DDI já presente pelo "+"
 * digitado, nunca pelos dígitos em si — o DDD 55 (Santa Maria/RS) faria
 * um número sem DDI virar falso-positivo de "já tem 55 do Brasil".
 */
export function paraWhatsappHref(numero: string): string {
  const comPrefixo = numero.trim().startsWith("+");
  const digitos = apenasDigitos(numero);
  return comPrefixo ? digitos : `55${digitos}`;
}
