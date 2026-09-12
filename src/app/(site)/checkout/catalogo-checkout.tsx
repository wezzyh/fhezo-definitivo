"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useCarrinho } from "@/lib/carrinho/contexto";
import { consultarCarrinho } from "./catalogo-actions";
const Contexto = createContext({
  verificando: true,
  erro: null as string | null,
  revalidar: () => {},
});
export function CatalogoCheckout({ children }: { children: ReactNode }) {
  const { itens, sincronizarItens, hidratado } = useCarrinho();
  const pathname = usePathname();
  const [resultado, setResultado] = useState({
    chave: "",
    erro: null as string | null,
  });
  const [tentativa, setTentativa] = useState(0);
  const entrada = JSON.stringify(
    itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
  );
  const chave = entrada + pathname + tentativa;
  useEffect(() => {
    if (!hidratado || entrada === "[]") return;
    let ativo = true;
    consultarCarrinho(JSON.parse(entrada))
      .then((r) => {
        if (!ativo) return;
        if (r.sucesso) sincronizarItens(r.itens);
        setResultado({ chave, erro: r.sucesso ? null : r.mensagem });
      })
      .catch(() => {
        if (ativo)
          setResultado({
            chave,
            erro: "Não foi possível conferir o carrinho. Tente novamente.",
          });
      });
    return () => {
      ativo = false;
    };
  }, [entrada, chave, hidratado, sincronizarItens]);
  useEffect(() => {
    const atualizar = () => setTentativa((t) => t + 1);
    window.addEventListener("focus", atualizar);
    return () => window.removeEventListener("focus", atualizar);
  }, []);
  return (
    <Contexto.Provider
      value={{
        verificando:
          !hidratado || (itens.length > 0 && resultado.chave !== chave),
        erro: resultado.chave === chave ? resultado.erro : null,
        revalidar: () => setTentativa((t) => t + 1),
      }}
    >
      {children}
    </Contexto.Provider>
  );
}
export const useCatalogoCheckout = () => useContext(Contexto);
