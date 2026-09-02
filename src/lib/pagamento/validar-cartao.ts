// Validação de cartão no navegador — só para dar feedback rápido antes de
// enviar ao Asaas. A validação que realmente decide se o cartão é aceito é
// sempre a do Asaas (antifraude, saldo, emissor etc.).

export function validarNumeroCartao(valor: string): boolean {
  const numeros = valor.replace(/\D/g, "");
  if (numeros.length < 13 || numeros.length > 19) return false;

  // Algoritmo de Luhn.
  let soma = 0;
  let dobrar = false;
  for (let i = numeros.length - 1; i >= 0; i--) {
    let digito = Number(numeros[i]);
    if (dobrar) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    soma += digito;
    dobrar = !dobrar;
  }
  return soma % 10 === 0;
}

/** `validade` no formato "MM/AA" ou "MM/AAAA". */
export function validarValidadeCartao(validade: string): boolean {
  const partes = validade.split("/").map((parte) => parte.trim());
  if (partes.length !== 2) return false;

  const mes = Number(partes[0]);
  const anoDigitado = Number(partes[1]);
  if (!mes || mes < 1 || mes > 12 || Number.isNaN(anoDigitado)) return false;

  const ano = anoDigitado < 100 ? 2000 + anoDigitado : anoDigitado;

  const agora = new Date();
  const fimDoMesValidade = new Date(ano, mes, 0, 23, 59, 59);
  return fimDoMesValidade >= agora;
}

export function validarCvv(cvv: string): boolean {
  return /^\d{3,4}$/.test(cvv.trim());
}

export function separarValidadeCartao(validade: string): { mes: string; ano: string } {
  const [mes, ano] = validade.split("/").map((parte) => parte.trim());
  const anoNumero = Number(ano);
  const anoCompleto = anoNumero < 100 ? String(2000 + anoNumero) : ano;
  return { mes: mes.padStart(2, "0"), ano: anoCompleto };
}
