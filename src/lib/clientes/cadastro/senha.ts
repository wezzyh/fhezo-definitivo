// Regras de senha do cadastro de cliente. O hash em si é feito pelo Supabase
// Auth (bcrypt) — a senha nunca é gravada por código deste projeto; aqui só
// se decide o que é aceitável antes de mandá-la para o signUp.

export const SENHA_MIN = 8;

// bcrypt ignora tudo depois do byte 72: acima disso, o resto da senha não
// protegeria nada. Limite em BYTES, não caracteres (acento/emoji ocupam 2–4).
export const SENHA_MAX_BYTES = 72;

// Senhas de 8+ caracteres que aparecem no topo de todo vazamento público
// (as de menos de 8 já são barradas pelo tamanho). Comparação sem
// diferenciar maiúsculas. Sequências e caracteres repetidos são detectados
// por regra em ehSenhaComum, não precisam estar aqui.
const SENHAS_COMUNS = new Set([
  "password", "password1", "password123", "passw0rd",
  "senha123", "senha1234", "senha12345", "senha123456", "minhasenha", "mudar123", "123mudar",
  "12345678910", "123123123", "123321123", "102030405060", "1020304050",
  "qwertyui", "qwerty123", "qwertyuiop", "asdfghjk", "asdfghjkl", "zxcvbnm1",
  "1q2w3e4r", "1q2w3e4r5t", "q1w2e3r4", "q1w2e3r4t5", "aa123456", "abc12345", "abcd1234",
  "iloveyou", "princesa", "brasil123", "flamengo", "corinthians", "palmeiras",
  "admin123", "teste123", "welcome1", "fhezo123",
]);

function ehSequencia(senha: string): boolean {
  let crescente = true;
  let decrescente = true;
  for (let i = 1; i < senha.length; i++) {
    const diferenca = senha.charCodeAt(i) - senha.charCodeAt(i - 1);
    if (diferenca !== 1) crescente = false;
    if (diferenca !== -1) decrescente = false;
  }
  return crescente || decrescente;
}

/** true para senha da lista, só um caractere repetido ("aaaaaaaa") ou sequência ("12345678", "hgfedcba"). */
export function ehSenhaComum(senha: string): boolean {
  const normalizada = senha.toLowerCase();
  return SENHAS_COMUNS.has(normalizada) || /^(.)\1+$/.test(normalizada) || ehSequencia(normalizada);
}

export function senhaCabeNoLimite(senha: string): boolean {
  return new TextEncoder().encode(senha).length <= SENHA_MAX_BYTES;
}

export type NivelForcaSenha = 0 | 1 | 2 | 3 | 4;

export const ROTULOS_FORCA_SENHA: Record<NivelForcaSenha, string> = {
  0: "",
  1: "Fraca",
  2: "Razoável",
  3: "Boa",
  4: "Forte",
};

/**
 * Nível só para o indicador visual. "Fraca" (1) = seria recusada; de 2 em
 * diante é aceita, e o nível sobe com tamanho e variedade de caracteres.
 */
export function avaliarForcaSenha(senha: string): NivelForcaSenha {
  if (!senha) return 0;
  if (senha.length < SENHA_MIN || ehSenhaComum(senha)) return 1;

  const tiposDeCaractere = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((regex) => regex.test(senha)).length;
  const pontos =
    (senha.length >= 12 ? 1 : 0) +
    (senha.length >= 16 ? 1 : 0) +
    (tiposDeCaractere >= 3 ? 1 : 0) +
    (tiposDeCaractere === 4 ? 1 : 0);

  if (pontos === 0) return 2;
  if (pontos <= 2) return 3;
  return 4;
}
