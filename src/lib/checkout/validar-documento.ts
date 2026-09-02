// Validação de CPF/CNPJ pelo algoritmo de dígito verificador (módulo 11),
// não apenas pelo formato/tamanho da string.

function calcularDigitoVerificador(digitos: number[], pesos: number[]): number {
  const soma = digitos.reduce((total, digito, indice) => total + digito * pesos[indice], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function validarCPF(valor: string): boolean {
  const numeros = valor.replace(/\D/g, "");
  if (numeros.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numeros)) return false;

  const digitos = numeros.split("").map(Number);
  const dv1 = calcularDigitoVerificador(digitos.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const dv2 = calcularDigitoVerificador(digitos.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);

  return dv1 === digitos[9] && dv2 === digitos[10];
}

export function validarCNPJ(valor: string): boolean {
  const numeros = valor.replace(/\D/g, "");
  if (numeros.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(numeros)) return false;

  const digitos = numeros.split("").map(Number);
  const dv1 = calcularDigitoVerificador(digitos.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const dv2 = calcularDigitoVerificador(
    digitos.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return dv1 === digitos[12] && dv2 === digitos[13];
}
