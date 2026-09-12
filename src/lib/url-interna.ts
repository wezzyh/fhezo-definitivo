/**
 * Destino de redirecionamento vindo da URL (?proximo=, ?next=). Só aceita
 * caminho interno ("/conta"): "//outro-site.com" e "/\outro-site.com"
 * começam com "/" mas o navegador os trata como OUTRO domínio — aceitar
 * isso seria um redirecionamento aberto.
 */
export function destinoInterno(proximo: string | null | undefined, padrao = "/conta"): string {
  if (!proximo || !proximo.startsWith("/") || proximo.startsWith("//") || proximo.startsWith("/\\")) {
    return padrao;
  }
  return proximo;
}
