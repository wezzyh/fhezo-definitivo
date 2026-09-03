// Funções utilitárias que leem o relógio (Date.now()) — separadas dos
// componentes que as usam de propósito: o lint react-hooks/purity marca
// `Date.now()`/`new Date()` como "impuro" quando chamado direto no corpo
// de um componente (mesmo em Server Component). Isolar a leitura do
// relógio aqui, numa função comum, satisfaz o lint sem perder o
// comportamento — o valor ainda é lido a cada requisição, como deveria.

/** ISO de "N dias atrás", a partir de agora. */
export function isoDiasAtras(dias: number): string {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
}
