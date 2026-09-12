// Aplicada ao documento inteiro do checkout; não altera o catálogo ou admin.
export function politicaCheckout(
  nonce: string,
  desenvolvimento: boolean,
  supabaseUrl?: string,
) {
  let origem = "";
  try {
    const url = new URL(supabaseUrl ?? "");
    if (url.protocol === "https:") origem = url.origin;
  } catch {}
  return [
    "default-src 'self'",
    "script-src 'self' 'nonce-" +
      nonce +
      "' 'strict-dynamic'" +
      (desenvolvimento ? " 'unsafe-eval'" : ""),
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: " + origem,
    "font-src 'self'",
    "connect-src 'self' " +
      origem +
      (desenvolvimento ? " ws://localhost:* ws://127.0.0.1:*" : ""),
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
