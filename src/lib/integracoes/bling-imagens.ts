import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// Re-hospeda imagens vindas do Bling no nosso Storage próprio (bucket
// "admin-imagens", mesmo bucket do upload manual do admin — ver
// src/components/admin/upload-imagem-actions.ts). Necessário porque as
// URLs "internas" do Bling (upload direto na plataforma deles) são links
// assinados da AWS S3 com validade de ~7 dias (ver extrairDadosImportadosBling
// em bling-produto-detalhe.ts) — gravar essas URLs cruas faria a imagem
// parar de carregar sozinha depois de uma semana.
//
// Diferente de enviarImagemAdmin (upload-imagem-actions.ts), esta função
// não depende de sessão de usuário via cookies: roda tanto na
// sincronização de estoque quanto no botão "Importar do Bling", os dois
// com o cliente admin (service_role), sem necessariamente uma sessão
// autenticada no ar.

const BUCKET = "admin-imagens";
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB — mesmo limite do upload manual

/**
 * O bucket "admin-imagens" só aceita image/jpeg, image/png, image/webp
 * (allowlist configurada no bucket). As imagens do Bling vêm com
 * `content-type: application/octet-stream` mesmo sendo imagem de
 * verdade — confiar nesse header faz o Storage rejeitar o upload com 415
 * (confirmado direto contra o bucket real). Por isso o formato é
 * detectado pelos primeiros bytes do arquivo (assinatura/"magic number"),
 * não pelo header da resposta.
 */
function detectarTipoImagemPorBytes(bytes: Uint8Array): { extensao: string; contentType: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extensao: "jpg", contentType: "image/jpeg" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { extensao: "png", contentType: "image/png" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { extensao: "webp", contentType: "image/webp" };
  }
  return null;
}

/**
 * Baixa uma imagem de uma URL (tipicamente do Bling) e sobe para o bucket
 * "admin-imagens/produtos", com o mesmo padrão de nome já usado antes
 * (bling-<uuid>.<extensão real>). Retorna a URL pública nova, ou `null`
 * em qualquer falha (download, tamanho, ou upload) — melhor esforço, quem
 * chama decide como reportar.
 */
export async function rehospedarImagemBling(
  supabase: SupabaseClient,
  urlOrigem: string,
): Promise<string | null> {
  let resposta: Response;
  try {
    resposta = await fetch(urlOrigem, { cache: "no-store" });
  } catch {
    return null;
  }

  if (!resposta.ok) return null;

  const bytes = new Uint8Array(await resposta.arrayBuffer());

  if (bytes.byteLength === 0 || bytes.byteLength > TAMANHO_MAXIMO_BYTES) return null;

  const tipo = detectarTipoImagemPorBytes(bytes);
  if (!tipo) return null;

  const caminho = `produtos/bling-${crypto.randomUUID()}.${tipo.extensao}`;

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, bytes, {
    contentType: tipo.contentType,
    upsert: false,
  });

  if (error) return null;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  return data.publicUrl;
}

export interface ResultadoRehospedarImagens {
  /** URLs já hospedadas no nosso Storage, na mesma ordem recebida — a primeira é a capa. */
  urls: string[];
  /** Quantas URLs de origem falharam ao baixar (não conseguiram nem virar candidatas ao upload). */
  falhas: number;
}

/** Re-hospeda uma lista de URLs, uma por vez (evita paralelismo excessivo de download+upload). */
export async function rehospedarImagensBling(
  supabase: SupabaseClient,
  urlsOrigem: string[],
): Promise<ResultadoRehospedarImagens> {
  const urls: string[] = [];
  let falhas = 0;

  for (const urlOrigem of urlsOrigem) {
    const urlNova = await rehospedarImagemBling(supabase, urlOrigem);
    if (urlNova) {
      urls.push(urlNova);
    } else {
      falhas++;
    }
  }

  return { urls, falhas };
}
