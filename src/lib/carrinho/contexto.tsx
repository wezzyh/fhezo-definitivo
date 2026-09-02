"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import {
  carrinhoReducer,
  estadoInicialCarrinho,
  type ItemCarrinho,
  type NovoItemCarrinho,
} from "./reducer";

const CHAVE_LOCALSTORAGE = "fhezo:carrinho";

interface ContextoCarrinhoValor {
  itens: ItemCarrinho[];
  quantidadeTotal: number;
  subtotal: number;
  adicionarItem: (item: NovoItemCarrinho, quantidade?: number) => void;
  removerItem: (produtoId: string) => void;
  alterarQuantidade: (produtoId: string, quantidade: number) => void;
  limparCarrinho: () => void;
}

const CarrinhoContext = createContext<ContextoCarrinhoValor | null>(null);

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(carrinhoReducer, estadoInicialCarrinho);
  const hidratado = useRef(false);

  // Carrega o carrinho salvo no localStorage assim que o componente monta no
  // navegador. Só roda no cliente — o servidor sempre parte de um carrinho
  // vazio, então o primeiro render (SSR) e o primeiro render no cliente
  // continuam idênticos, evitando erro de hidratação.
  useEffect(() => {
    try {
      const bruto = window.localStorage.getItem(CHAVE_LOCALSTORAGE);
      if (bruto) {
        dispatch({ tipo: "HIDRATAR", itens: JSON.parse(bruto) });
      }
    } catch {
      // localStorage indisponível (aba anônima, cookies bloqueados etc.) —
      // segue com o carrinho vazio nesta sessão.
    } finally {
      hidratado.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hidratado.current) return;
    try {
      window.localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(estado.itens));
    } catch {
      // Sem acesso ao localStorage — o carrinho continua funcionando nesta
      // aba, só não persiste entre recarregamentos de página.
    }
  }, [estado.itens]);

  const adicionarItem = useCallback((item: NovoItemCarrinho, quantidade = 1) => {
    dispatch({ tipo: "ADICIONAR", item, quantidade });
  }, []);

  const removerItem = useCallback((produtoId: string) => {
    dispatch({ tipo: "REMOVER", produtoId });
  }, []);

  const alterarQuantidade = useCallback((produtoId: string, quantidade: number) => {
    dispatch({ tipo: "ALTERAR_QUANTIDADE", produtoId, quantidade });
  }, []);

  const limparCarrinho = useCallback(() => {
    dispatch({ tipo: "LIMPAR" });
  }, []);

  const quantidadeTotal = useMemo(
    () => estado.itens.reduce((total, item) => total + item.quantidade, 0),
    [estado.itens],
  );

  const subtotal = useMemo(
    () => estado.itens.reduce((total, item) => total + item.preco * item.quantidade, 0),
    [estado.itens],
  );

  const valor = useMemo<ContextoCarrinhoValor>(
    () => ({
      itens: estado.itens,
      quantidadeTotal,
      subtotal,
      adicionarItem,
      removerItem,
      alterarQuantidade,
      limparCarrinho,
    }),
    [estado.itens, quantidadeTotal, subtotal, adicionarItem, removerItem, alterarQuantidade, limparCarrinho],
  );

  return <CarrinhoContext.Provider value={valor}>{children}</CarrinhoContext.Provider>;
}

export function useCarrinho(): ContextoCarrinhoValor {
  const contexto = useContext(CarrinhoContext);
  if (!contexto) {
    throw new Error("useCarrinho precisa ser usado dentro de um <CarrinhoProvider>.");
  }
  return contexto;
}
