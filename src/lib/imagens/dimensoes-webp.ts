import "server-only";

export interface DimensoesImagem {
  largura: number;
  altura: number;
}

/**
 * Lê a largura/altura reais de uma imagem WebP, buscando só os primeiros
 * bytes do arquivo (Range request) em vez de baixar o arquivo inteiro —
 * o cabeçalho de qualquer variante de WebP (VP8X/VP8/VP8L) cabe bem
 * dentro dos primeiros 64 bytes.
 *
 * Banners são sempre WebP: o upload (src/components/admin/upload-imagem.tsx)
 * converte no navegador antes de enviar. `cache`/`revalidate` seguem o
 * mesmo padrão das outras leituras públicas de conteúdo (ver
 * src/lib/conteudo/consultas.ts) — a proporção de um banner só muda
 * quando o admin publica um novo, e updateTag/revalidatePath já
 * invalidam nesse caso.
 *
 * Não usa nenhuma lib de parsing de imagem (ex.: image-size) de propósito:
 * na época em que isso foi escrito ela tinha uma vulnerabilidade conhecida
 * (DoS via loop infinito) nos parsers de ICNS/JXL/HEIF — formatos que este
 * projeto nunca usa. Como só precisamos de WebP, um parser mínimo e
 * auto-contido (sem laços, sem recursão, tamanho de entrada limitado pelo
 * Range request) elimina essa superfície de ataque em vez de carregar uma
 * lib genérica.
 */
export async function obterDimensoesWebp(url: string): Promise<DimensoesImagem | null> {
  try {
    const resposta = await fetch(url, {
      headers: { Range: "bytes=0-63" },
      next: { revalidate: 300 },
    });
    if (!resposta.ok && resposta.status !== 206) return null;
    return lerDimensoesWebp(new Uint8Array(await resposta.arrayBuffer()));
  } catch {
    return null;
  }
}

function lerUint16LE(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8);
}

function lerUint24LE(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16);
}

function lerDimensoesWebp(buf: Uint8Array): DimensoesImagem | null {
  if (buf.length < 30) return null;

  const riff = String.fromCharCode(buf[0], buf[1], buf[2], buf[3]);
  const webp = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
  if (riff !== "RIFF" || webp !== "WEBP") return null;

  const chunk = String.fromCharCode(buf[12], buf[13], buf[14], buf[15]);

  // VP8X: formato estendido (com alpha/exif/animação) — canvas size em
  // dois campos de 24 bits (valor - 1), a partir do byte 24.
  if (chunk === "VP8X") {
    const largura = 1 + lerUint24LE(buf, 24);
    const altura = 1 + lerUint24LE(buf, 27);
    return largura > 0 && altura > 0 ? { largura, altura } : null;
  }

  // VP8 (lossy simples): largura/altura em dois campos de 16 bits (14
  // bits úteis + 2 bits de escala, descartados), a partir do byte 26.
  if (chunk === "VP8 ") {
    const largura = lerUint16LE(buf, 26) & 0x3fff;
    const altura = lerUint16LE(buf, 28) & 0x3fff;
    return largura > 0 && altura > 0 ? { largura, altura } : null;
  }

  // VP8L (lossless): 1 byte de assinatura (0x2f) seguido de 4 bytes com
  // largura-1 e altura-1 empacotados em 14 bits cada, little-endian.
  if (chunk === "VP8L") {
    if (buf[20] !== 0x2f) return null;
    const bits = buf[21] | (buf[22] << 8) | (buf[23] << 16) | (buf[24] << 24);
    const largura = 1 + (bits & 0x3fff);
    const altura = 1 + ((bits >>> 14) & 0x3fff);
    return largura > 0 && altura > 0 ? { largura, altura } : null;
  }

  return null;
}
