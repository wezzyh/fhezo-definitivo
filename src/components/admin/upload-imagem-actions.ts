"use server";

import { criarClienteSupabaseServidor } from "@/lib/supabase/server";

const BUCKET = "admin-imagens";
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB
const TIPOS_ACEITOS = new Set(["image/jpeg", "image/png", "image/webp"]);
const PASTAS_PERMITIDAS = new Set(["produtos", "banners", "footer-pagamentos", "footer-selos", "categorias", "marcas"]);

export type ResultadoUploadImagem = { sucesso: true; url: string } | { sucesso: false; erro: string };

function extensaoPorTipo(tipo: string): string {
  if (tipo === "image/webp") return "webp";
  if (tipo === "image/png") return "png";
  return "jpg";
}

/**
 * Recebe um arquivo já convertido/redimensionado no client (ver
 * converterImagemParaWebP) e sobe para o bucket público "admin-imagens".
 * A validação de tipo/tamanho é refeita aqui — nunca confiar só no que o
 * client já validou antes de chamar isto.
 */
export async function enviarImagemAdmin(formData: FormData): Promise<ResultadoUploadImagem> {
  const arquivo = formData.get("arquivo");
  const pasta = String(formData.get("pasta") ?? "");

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { sucesso: false, erro: "Nenhum arquivo recebido." };
  }
  if (!PASTAS_PERMITIDAS.has(pasta)) {
    return { sucesso: false, erro: "Destino de upload inválido." };
  }
  if (!TIPOS_ACEITOS.has(arquivo.type)) {
    return { sucesso: false, erro: "Formato de imagem inválido. Envie um arquivo JPG, PNG ou WebP." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return { sucesso: false, erro: "A imagem excede o tamanho máximo de 5 MB." };
  }

  const supabase = await criarClienteSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { sucesso: false, erro: "Sua sessão expirou. Faça login novamente e tente de novo." };
  }

  const caminho = `${pasta}/${crypto.randomUUID()}.${extensaoPorTipo(arquivo.type)}`;
  const bytes = new Uint8Array(await arquivo.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, bytes, {
    contentType: arquivo.type,
    upsert: false,
  });

  if (error) {
    return { sucesso: false, erro: `Falha ao enviar a imagem: ${error.message}` };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  return { sucesso: true, url: data.publicUrl };
}

/** Extrai o caminho dentro do bucket a partir de uma URL pública já gerada por enviarImagemAdmin — null se a URL não pertence a este bucket (ex.: URL colada manualmente antes deste recurso existir). */
function caminhoNoBucket(url: string): string | null {
  const marcador = `/storage/v1/object/public/${BUCKET}/`;
  const indice = url.indexOf(marcador);
  if (indice === -1) return null;
  return url.slice(indice + marcador.length);
}

/**
 * Remove, de forma best-effort, uma imagem antiga do Storage quando ela é
 * substituída por uma nova — evita acumular arquivo órfão. Nunca lança:
 * se a URL não for deste bucket (imagem colada manualmente antes deste
 * recurso existir) ou a remoção falhar, simplesmente não faz nada — a
 * troca da imagem no registro já foi salva, isso é só limpeza.
 */
export async function removerImagemAdminSeOrfa(urlAntiga: string | null, urlNova: string | null): Promise<void> {
  if (!urlAntiga || urlAntiga === urlNova) return;

  const caminho = caminhoNoBucket(urlAntiga);
  if (!caminho) return;

  try {
    const supabase = await criarClienteSupabaseServidor();
    await supabase.storage.from(BUCKET).remove([caminho]);
  } catch {
    // melhor esforço — falha aqui não deve afetar o fluxo de salvar o formulário.
  }
}
