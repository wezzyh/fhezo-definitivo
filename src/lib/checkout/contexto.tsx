"use client";
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import { useCarrinho } from "@/lib/carrinho/contexto";
import {
  CHAVE_CHECKOUT,
  esquemaRascunhoCheckout,
  chaveCotacao,
  type RascunhoCheckout,
} from "./rascunho";
import type {
  DadosPF,
  DadosPJ,
  EnderecoEntrega,
  FreteSelecionado,
  TipoClienteCheckout,
} from "./tipos";
import type { PerfilCheckout } from "@/app/(site)/checkout/actions";
import type { FormaPagamento } from "@/types/database";
const inicial: RascunhoCheckout = {
  contaId: null,
  tipoCliente: "PF",
  dadosPF: { nomeCompleto: "", cpf: "", email: "", telefone: "" },
  dadosPJ: {
    razaoSocial: "",
    cnpj: "",
    inscricaoEstadual: "",
    email: "",
    telefone: "",
  },
  endereco: {
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
  },
  cotacao: null,
  confirmado: false,
  clienteId: null,
  checkoutId: "",
  formaPagamento: "pix",
  pedidoId: null,
};
type Estado = RascunhoCheckout & { hidratado: boolean };
type Acao =
  | { tipo: "perfil"; cliente: PerfilCheckout }
  | { tipo: "hidratar"; dados: RascunhoCheckout }
  | { tipo: "alterar"; dados: Partial<RascunhoCheckout> }
  | { tipo: "pf"; dados: Partial<DadosPF> }
  | { tipo: "pj"; dados: Partial<DadosPJ> }
  | { tipo: "endereco"; dados: Partial<EnderecoEntrega> };
function reducer(estado: Estado, acao: Acao): Estado {
  if (acao.tipo === "perfil") {
    const c = acao.cliente;
    const mesmaConta = estado.contaId === c.id;
    const cepCarrinho = !estado.contaId ? estado.endereco.cep : "";
    const mesmoCep =
      !cepCarrinho ||
      cepCarrinho.replace(/\D/g, "") ===
        (c.endereco_cep ?? "").replace(/\D/g, "");
    const endereco = mesmaConta
      ? estado.endereco
      : {
          cep: cepCarrinho || c.endereco_cep || "",
          rua: mesmoCep ? c.endereco_rua || "" : "",
          numero: mesmoCep ? c.endereco_numero || "" : "",
          complemento: mesmoCep ? c.endereco_complemento || "" : "",
          bairro: mesmoCep ? c.endereco_bairro || "" : "",
          cidade: mesmoCep ? c.endereco_cidade || "" : "",
          uf: mesmoCep ? c.endereco_uf || "" : "",
        };
    return {
      ...estado,
      contaId: c.id,
      tipoCliente: c.tipo,
      dadosPF:
        c.tipo === "PF"
          ? {
              nomeCompleto: c.nome,
              cpf: c.documento,
              email: c.email,
              telefone: c.telefone ?? "",
            }
          : inicial.dadosPF,
      dadosPJ:
        c.tipo === "PJ"
          ? {
              razaoSocial: c.nome,
              cnpj: c.documento,
              email: c.email,
              telefone: c.telefone ?? "",
              inscricaoEstadual: "",
            }
          : inicial.dadosPJ,
      endereco,
      confirmado: false,
      clienteId: c.id,
      pedidoId: mesmaConta ? estado.pedidoId : null,
    };
  }
  if (acao.tipo === "hidratar") return { ...acao.dados, hidratado: true };
  if (acao.tipo === "alterar") return { ...estado, ...acao.dados };
  const campo =
    acao.tipo === "pf"
      ? "dadosPF"
      : acao.tipo === "pj"
        ? "dadosPJ"
        : "endereco";
  return {
    ...estado,
    [campo]: { ...estado[campo], ...acao.dados },
    confirmado: false,
    clienteId: null,
  };
}
interface ContextoCheckoutValor extends Omit<Estado, "cotacao"> {
  identificarCliente: (cliente: PerfilCheckout) => void;
  definirTipoCliente: (tipo: TipoClienteCheckout) => void;
  atualizarDadosPF: (dados: Partial<DadosPF>) => void;
  atualizarDadosPJ: (dados: Partial<DadosPJ>) => void;
  atualizarEndereco: (dados: Partial<EnderecoEntrega>) => void;
  freteSelecionado: FreteSelecionado | null;
  definirFreteSelecionado: (frete: FreteSelecionado | null) => void;
  definirConfirmado: (valor: boolean) => void;
  definirClienteId: (id: string | null) => void;
  definirFormaPagamento: (forma: FormaPagamento) => void;
  registrarPedido: (id: string) => void;
  reiniciarCheckout: () => void;
}
const CheckoutContext = createContext<ContextoCheckoutValor | null>(null);
export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(reducer, {
    ...inicial,
    hidratado: false,
  });
  const { itens } = useCarrinho();
  useEffect(() => {
    let dados = { ...inicial, checkoutId: crypto.randomUUID() };
    try {
      const bruto = sessionStorage.getItem(CHAVE_CHECKOUT);
      if (bruto) {
        const parsed = esquemaRascunhoCheckout.safeParse(JSON.parse(bruto));
        if (parsed.success)
          dados = {
            ...parsed.data,
            cotacao:
              parsed.data.cotacao && parsed.data.cotacao.expira > Date.now()
                ? parsed.data.cotacao
                : null,
          };
      }
    } catch {}
    dispatch({ tipo: "hidratar", dados });
  }, []);
  useEffect(() => {
    if (!estado.hidratado) return;
    try {
      sessionStorage.setItem(
        CHAVE_CHECKOUT,
        JSON.stringify(esquemaRascunhoCheckout.parse(estado)),
      );
    } catch {}
  }, [estado]);
  useEffect(() => {
    if (!estado.cotacao) return;
    const timer = setTimeout(
      () => dispatch({ tipo: "alterar", dados: { cotacao: null } }),
      Math.max(0, estado.cotacao.expira - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [estado.cotacao]);
  const chave = chaveCotacao(estado.endereco.cep, itens);
  const freteSelecionado =
    estado.cotacao?.chave === chave ? estado.cotacao.frete : null;
  const identificarCliente = useCallback(
    (cliente: PerfilCheckout) => dispatch({ tipo: "perfil", cliente }),
    [],
  );
  const definirTipoCliente = useCallback(
    (tipo: TipoClienteCheckout) =>
      dispatch({
        tipo: "alterar",
        dados: { tipoCliente: tipo, confirmado: false, clienteId: null },
      }),
    [],
  );
  const atualizarDadosPF = useCallback(
    (dados: Partial<DadosPF>) => dispatch({ tipo: "pf", dados }),
    [],
  );
  const atualizarDadosPJ = useCallback(
    (dados: Partial<DadosPJ>) => dispatch({ tipo: "pj", dados }),
    [],
  );
  const atualizarEndereco = useCallback(
    (dados: Partial<EnderecoEntrega>) => dispatch({ tipo: "endereco", dados }),
    [],
  );
  const definirFreteSelecionado = useCallback(
    (frete: FreteSelecionado | null) =>
      dispatch({
        tipo: "alterar",
        dados: {
          cotacao: frete
            ? { frete, chave, expira: Date.now() + 15 * 60 * 1000 }
            : null,
        },
      }),
    [chave],
  );
  const definirConfirmado = useCallback(
    (confirmado: boolean) =>
      dispatch({
        tipo: "alterar",
        dados: confirmado ? { confirmado } : { confirmado, clienteId: null },
      }),
    [],
  );
  const definirClienteId = useCallback(
    (clienteId: string | null) =>
      dispatch({ tipo: "alterar", dados: { clienteId } }),
    [],
  );
  const definirFormaPagamento = useCallback(
    (formaPagamento: FormaPagamento) =>
      dispatch({ tipo: "alterar", dados: { formaPagamento } }),
    [],
  );
  const registrarPedido = useCallback((pedidoId: string) => {
    dispatch({ tipo: "alterar", dados: { pedidoId } });
    try {
      const parsed = esquemaRascunhoCheckout.safeParse(
        JSON.parse(sessionStorage.getItem(CHAVE_CHECKOUT) ?? "null"),
      );
      if (parsed.success)
        sessionStorage.setItem(
          CHAVE_CHECKOUT,
          JSON.stringify({ ...parsed.data, pedidoId }),
        );
    } catch {}
  }, []);
  const reiniciarCheckout = useCallback(
    () =>
      dispatch({
        tipo: "hidratar",
        dados: { ...inicial, checkoutId: crypto.randomUUID() },
      }),
    [],
  );
  return (
    <CheckoutContext.Provider
      value={{
        ...estado,
        identificarCliente,
        freteSelecionado,
        definirTipoCliente,
        atualizarDadosPF,
        atualizarDadosPJ,
        atualizarEndereco,
        definirFreteSelecionado,
        definirConfirmado,
        definirClienteId,
        definirFormaPagamento,
        registrarPedido,
        reiniciarCheckout,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}
export function useCheckout() {
  const contexto = useContext(CheckoutContext);
  if (!contexto) throw new Error("CheckoutProvider ausente.");
  return contexto;
}
