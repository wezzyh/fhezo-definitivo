import type { ItemMenu } from "./tipos";

// Manipulação imutável da árvore de itens de menu, endereçada por
// "caminho" (lista de índices, um por nível — ex.: [1, 0] é o primeiro
// filho do segundo item de topo). Usado pelo editor em
// src/app/admin/conteudo/menu/editor-menu.tsx.

function clonarArvore(itens: ItemMenu[]): ItemMenu[] {
  return itens.map((item) => ({ ...item, filhos: clonarArvore(item.filhos) }));
}

function localizarLista(itens: ItemMenu[], caminho: number[]): ItemMenu[] | null {
  if (caminho.length === 0) return itens;
  const [indice, ...resto] = caminho;
  const item = itens[indice];
  if (!item) return null;
  return localizarLista(item.filhos, resto);
}

function renumerarOrdem(itens: ItemMenu[]): void {
  itens.forEach((item, indice) => {
    item.ordem = indice + 1;
  });
}

export function novoItemMenu(): ItemMenu {
  return {
    id: crypto.randomUUID(),
    rotulo: "Novo item",
    tipo: "link",
    categoria_id: null,
    href: "/produtos",
    ordem: 0,
    filhos: [],
  };
}

export function adicionarItem(itens: ItemMenu[], caminho: number[]): ItemMenu[] {
  const novaArvore = clonarArvore(itens);
  const lista = localizarLista(novaArvore, caminho);
  if (!lista) return itens;
  lista.push(novoItemMenu());
  renumerarOrdem(lista);
  return novaArvore;
}

export function removerItem(itens: ItemMenu[], caminho: number[]): ItemMenu[] {
  const novaArvore = clonarArvore(itens);
  const caminhoPai = caminho.slice(0, -1);
  const indice = caminho[caminho.length - 1];
  const lista = localizarLista(novaArvore, caminhoPai);
  if (!lista) return itens;
  lista.splice(indice, 1);
  renumerarOrdem(lista);
  return novaArvore;
}

export function moverItem(itens: ItemMenu[], caminho: number[], direcao: -1 | 1): ItemMenu[] {
  const novaArvore = clonarArvore(itens);
  const caminhoPai = caminho.slice(0, -1);
  const indice = caminho[caminho.length - 1];
  const lista = localizarLista(novaArvore, caminhoPai);
  if (!lista) return itens;
  const novoIndice = indice + direcao;
  if (novoIndice < 0 || novoIndice >= lista.length) return itens;
  [lista[indice], lista[novoIndice]] = [lista[novoIndice], lista[indice]];
  renumerarOrdem(lista);
  return novaArvore;
}

export function atualizarItem(
  itens: ItemMenu[],
  caminho: number[],
  alteracoes: Partial<Pick<ItemMenu, "rotulo" | "tipo" | "categoria_id" | "href">>,
): ItemMenu[] {
  const novaArvore = clonarArvore(itens);
  const caminhoPai = caminho.slice(0, -1);
  const indice = caminho[caminho.length - 1];
  const lista = localizarLista(novaArvore, caminhoPai);
  if (!lista || !lista[indice]) return itens;
  lista[indice] = { ...lista[indice], ...alteracoes };
  return novaArvore;
}
