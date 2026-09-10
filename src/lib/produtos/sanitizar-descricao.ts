import sanitizeHtml from "sanitize-html";

const TAGS_PERMITIDAS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "span",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "div",
];

const ATRIBUTOS_PERMITIDOS = ["href", "target", "rel", "style", "class"];

// "descricao" é salva como texto puro (Textarea do admin, importação
// CSV/XLSX — nenhum dos dois processa HTML), mas às vezes chega com HTML
// literal colado de fora (ex.: copiado do painel do Bling), sem nenhum
// tratamento. Em vez de tentar detectar "isto é HTML ou texto puro" e ter
// dois caminhos de renderização, sanitiza sempre e renderiza como HTML:
// texto puro sem tags passa incólume (nada para o sanitizador remover), e
// o container usa white-space: pre-line (ver produtos/[id]/page.tsx) para
// preservar quebras de linha de texto puro também — um único caminho
// cobre os dois casos.
//
// Usa sanitize-html (puro JS, sem dependência nativa/DOM) em vez de
// isomorphic-dompurify — esse dependia de jsdom, cuja dependência
// html-encoding-sniffer -> @exodus/bytes é publicada como ESM-only.
// Isso quebrava em runtime só na Vercel com
// "ERR_REQUIRE_ESM: require() of ES Module .../encoding-lite.js", mesmo
// com Node 24 configurado lá (o runtime de functions da Vercel não tem
// paridade total com o require(esm) nativo do Node) — nunca reproduzia
// localmente. Trocar a lib elimina a causa raiz em vez de tentar
// contornar o empacotamento/runtime.
export function sanitizarDescricaoProduto(descricao: string): string {
  return sanitizeHtml(descricao, {
    allowedTags: TAGS_PERMITIDAS,
    allowedAttributes: {
      "*": ATRIBUTOS_PERMITIDOS,
    },
    // Defesa extra contra tabnabbing em links com target="_blank" vindos
    // do HTML externo — força rel="noopener noreferrer" mesmo que o HTML
    // original não tenha.
    transformTags: {
      a: (tagName, attribs) => {
        if (attribs.target === "_blank") {
          attribs.rel = "noopener noreferrer";
        }
        return { tagName, attribs };
      },
    },
  });
}
