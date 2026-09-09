import type { Categoria } from "@/types/database";

export interface CategoriaComProfundidade extends Categoria {
  /** 0 = categoria de topo, 1 = subcategoria direta, 2 = neta, etc. */
  profundidade: number;
}

/**
 * Achata a árvore de categorias numa lista ordenada (pai sempre antes dos
 * filhos, irmãos em ordem alfabética), com a profundidade de cada uma —
 * usado para indentar visualmente a hierarquia em <select> e listagens.
 * Protegido contra ciclos (categoria_pai_id apontando para um descendente
 * dela mesma): uma categoria já visitada nunca é revisitada.
 */
export function ordenarCategoriasComHierarquia(categorias: Categoria[]): CategoriaComProfundidade[] {
  const filhosPorPai = new Map<string | null, Categoria[]>();
  for (const categoria of categorias) {
    const chave = categoria.categoria_pai_id;
    const lista = filhosPorPai.get(chave);
    if (lista) {
      lista.push(categoria);
    } else {
      filhosPorPai.set(chave, [categoria]);
    }
  }
  for (const lista of filhosPorPai.values()) {
    lista.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
  }

  const resultado: CategoriaComProfundidade[] = [];
  const visitadas = new Set<string>();

  function visitar(paiId: string | null, profundidade: number) {
    for (const categoria of filhosPorPai.get(paiId) ?? []) {
      if (visitadas.has(categoria.id)) continue;
      visitadas.add(categoria.id);
      resultado.push({ ...categoria, profundidade });
      visitar(categoria.id, profundidade + 1);
    }
  }

  visitar(null, 0);
  return resultado;
}

/** Rótulo indentado para exibir a hierarquia num <select> (ex.: "— Rolamentos Rígidos"). */
export function rotuloComIndentacao(categoria: CategoriaComProfundidade): string {
  return "— ".repeat(categoria.profundidade) + categoria.nome;
}

/** IDs da categoria e de todos os seus descendentes — usado para impedir um ciclo ao escolher a categoria-mãe. */
export function descendentesDe(categoriaId: string, categorias: Categoria[]): Set<string> {
  const filhosPorPai = new Map<string | null, Categoria[]>();
  for (const categoria of categorias) {
    const chave = categoria.categoria_pai_id;
    const lista = filhosPorPai.get(chave);
    if (lista) {
      lista.push(categoria);
    } else {
      filhosPorPai.set(chave, [categoria]);
    }
  }

  const resultado = new Set<string>([categoriaId]);
  function visitar(id: string) {
    for (const filho of filhosPorPai.get(id) ?? []) {
      if (resultado.has(filho.id)) continue;
      resultado.add(filho.id);
      visitar(filho.id);
    }
  }
  visitar(categoriaId);
  return resultado;
}

/** Gera um slug simples (sem depender do Postgres) para preview/validação no formulário. */
export function gerarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
