// Máscaras leves de "digitar e formatar" para CPF, CNPJ, CEP e telefone —
// sem depender de nenhuma biblioteca externa.

export function formatarCPF(valor: string): string {
  const numeros = valor.replace(/\D/g, "").slice(0, 11);
  return numeros
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatarCNPJ(valor: string): string {
  const numeros = valor.replace(/\D/g, "").slice(0, 14);
  return numeros
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function formatarCEP(valor: string): string {
  const numeros = valor.replace(/\D/g, "").slice(0, 8);
  return numeros.replace(/(\d{5})(\d)/, "$1-$2");
}

export function formatarTelefone(valor: string): string {
  const numeros = valor.replace(/\D/g, "").slice(0, 11);
  if (numeros.length <= 10) {
    return numeros.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return numeros.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}
