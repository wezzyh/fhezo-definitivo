// Conversão de imagem para WebP no navegador (Canvas API), antes do
// upload — economiza banda de envio, não só espaço no Storage. Só roda no
// client (usa document/canvas), por isso não tem diretiva "use server" nem
// "use client" própria: é chamado de dentro de um Client Component.

const LARGURA_MAXIMA_PX = 1200;
const QUALIDADE_WEBP = 0.82;

let suportaWebpCache: boolean | null = null;

/** Detecta uma vez, com um canvas 1x1, se o navegador sabe CODIFICAR (não só decodificar) WebP. */
function suportaWebp(): boolean {
  if (suportaWebpCache !== null) return suportaWebpCache;
  const teste = document.createElement("canvas");
  teste.width = 1;
  teste.height = 1;
  // Navegadores sem encoder de WebP ignoram o mimeType pedido e devolvem
  // silenciosamente um data URL "image/png" — é assim que se detecta.
  suportaWebpCache = teste.toDataURL("image/webp").startsWith("data:image/webp");
  return suportaWebpCache;
}

function carregarImagem(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, rejeitar) => {
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => {
      URL.revokeObjectURL(url);
      resolve(imagem);
    };
    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      rejeitar(new Error("Não foi possível ler a imagem selecionada."));
    };
    imagem.src = url;
  });
}

function trocarExtensao(nomeArquivo: string, novaExtensao: string): string {
  const semExtensao = nomeArquivo.replace(/\.[^./\\]+$/, "");
  return `${semExtensao || "imagem"}.${novaExtensao}`;
}

/**
 * Redimensiona (só para baixo, nunca amplia) para no máximo 1200px de
 * largura e converte para WebP a ~82% de qualidade. Se o navegador não
 * souber codificar WebP, cai de volta pro formato original do arquivo sem
 * quebrar o upload — só a etapa de compressão/redimensionamento é
 * ignorada nesse caso (mantém o arquivo original como está).
 */
export async function converterImagemParaWebP(arquivo: File): Promise<File> {
  if (!suportaWebp()) {
    return arquivo;
  }

  const imagem = await carregarImagem(arquivo);
  const escala = Math.min(1, LARGURA_MAXIMA_PX / imagem.naturalWidth);
  const largura = Math.round(imagem.naturalWidth * escala);
  const altura = Math.round(imagem.naturalHeight * escala);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const contexto = canvas.getContext("2d");
  if (!contexto) return arquivo;

  contexto.drawImage(imagem, 0, 0, largura, altura);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALIDADE_WEBP));
  if (!blob) return arquivo;

  return new File([blob], trocarExtensao(arquivo.name, "webp"), { type: "image/webp" });
}
