import DOMPurify from "isomorphic-dompurify";

// Defesa extra contra tabnabbing em links com target="_blank" vindos do
// HTML externo (ex.: colado do Bling) — força rel="noopener noreferrer"
// mesmo que o HTML original não tenha.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

// "descricao" é salva como texto puro (Textarea do admin, importação
// CSV/XLSX — nenhum dos dois processa HTML), mas às vezes chega com HTML
// literal colado de fora (ex.: copiado do painel do Bling), sem nenhum
// tratamento. Em vez de tentar detectar "isto é HTML ou texto puro" e ter
// dois caminhos de renderização, sanitiza sempre com DOMPurify e renderiza
// como HTML: texto puro sem tags passa incólume (nada para o sanitizador
// remover), e o container usa white-space: pre-line (ver produtos/[id]/page.tsx)
// para preservar quebras de linha de texto puro também — um único caminho
// cobre os dois casos.
export function sanitizarDescricaoProduto(descricao: string): string {
  return DOMPurify.sanitize(descricao, {
    ALLOWED_TAGS: [
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
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "style", "class"],
  });
}
