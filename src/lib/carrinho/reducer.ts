// Reducer puro do carrinho de compras. Mantido separado do Context para ser
// fácil de testar isoladamente.

export interface ItemCarrinho {
  produtoId: string;
  sku: string;
  nome: string;
  preco: number;
  quantidade: number;
  estoque: number;
  pesoKg: number;
  alturaCm: number;
  larguraCm: number;
  comprimentoCm: number;
  /** Opcional — produtos adicionados antes desta mudança ficam sem imagem no drawer, sem quebrar o carrinho salvo no localStorage. */
  imagemUrl?: string | null;
}

export type NovoItemCarrinho = Omit<ItemCarrinho, "quantidade">;

export interface EstadoCarrinho {
  itens: ItemCarrinho[];
}

export type AcaoCarrinho =
  | { tipo: "ADICIONAR"; item: NovoItemCarrinho; quantidade: number }
  | { tipo: "REMOVER"; produtoId: string }
  | { tipo: "ALTERAR_QUANTIDADE"; produtoId: string; quantidade: number }
  | { tipo: "LIMPAR" }
  | { tipo: "SINCRONIZAR"; itens: ItemCarrinho[] }
  | { tipo: "HIDRATAR"; itens: ItemCarrinho[] };

export const estadoInicialCarrinho: EstadoCarrinho = { itens: [] };

function clamp(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), maximo);
}

export function carrinhoReducer(
  estado: EstadoCarrinho,
  acao: AcaoCarrinho,
): EstadoCarrinho {
  switch (acao.tipo) {
    case "ADICIONAR": {
      const estoqueDisponivel = Math.max(acao.item.estoque, 1);
      const existente = estado.itens.find(
        (item) => item.produtoId === acao.item.produtoId,
      );

      if (existente) {
        return {
          itens: estado.itens.map((item) =>
            item.produtoId === acao.item.produtoId
              ? {
                  ...item,
                  quantidade: clamp(
                    item.quantidade + acao.quantidade,
                    1,
                    estoqueDisponivel,
                  ),
                }
              : item,
          ),
        };
      }

      return {
        itens: [
          ...estado.itens,
          {
            ...acao.item,
            quantidade: clamp(acao.quantidade, 1, estoqueDisponivel),
          },
        ],
      };
    }

    case "REMOVER":
      return {
        itens: estado.itens.filter((item) => item.produtoId !== acao.produtoId),
      };

    case "ALTERAR_QUANTIDADE": {
      // Nunca remove o item por chegar a 0 — mínimo sempre 1, pra não
      // apagar do carrinho sem querer só por clicar demais no "-". Remover
      // de verdade é só pelo botão de lixeira (ação REMOVER, explícita).
      return {
        itens: estado.itens.map((item) =>
          item.produtoId === acao.produtoId
            ? {
                ...item,
                quantidade: clamp(
                  acao.quantidade,
                  1,
                  Math.max(item.estoque, 1),
                ),
              }
            : item,
        ),
      };
    }

    case "LIMPAR":
      return { itens: [] };

    case "SINCRONIZAR": {
      const mapa = new Map(acao.itens.map((i) => [i.produtoId, i]));
      const itens = estado.itens.map((item) => {
        const novo = mapa.get(item.produtoId);
        return novo ? { ...novo, quantidade: item.quantidade } : item;
      });
      return JSON.stringify(itens) === JSON.stringify(estado.itens)
        ? estado
        : { itens };
    }
    case "HIDRATAR":
      return {
        itens: Array.isArray(acao.itens)
          ? acao.itens.filter(
              (item) =>
                item &&
                typeof item.produtoId === "string" &&
                typeof item.nome === "string" &&
                typeof item.sku === "string" &&
                Number.isFinite(item.preco) &&
                item.preco >= 0 &&
                Number.isInteger(item.quantidade) &&
                item.quantidade > 0 &&
                Number.isInteger(item.estoque) &&
                item.estoque >= 0,
            )
          : [],
      };

    default:
      return estado;
  }
}
