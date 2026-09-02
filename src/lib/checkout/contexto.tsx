"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  DadosPF,
  DadosPJ,
  EnderecoEntrega,
  FreteSelecionado,
  TipoClienteCheckout,
} from "./tipos";

const dadosPFIniciais: DadosPF = { nomeCompleto: "", cpf: "", email: "", telefone: "" };

const dadosPJIniciais: DadosPJ = {
  razaoSocial: "",
  cnpj: "",
  inscricaoEstadual: "",
  email: "",
  telefone: "",
};

const enderecoInicial: EnderecoEntrega = {
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

interface ContextoCheckoutValor {
  tipoCliente: TipoClienteCheckout;
  definirTipoCliente: (tipo: TipoClienteCheckout) => void;
  dadosPF: DadosPF;
  atualizarDadosPF: (dados: Partial<DadosPF>) => void;
  dadosPJ: DadosPJ;
  atualizarDadosPJ: (dados: Partial<DadosPJ>) => void;
  endereco: EnderecoEntrega;
  atualizarEndereco: (dados: Partial<EnderecoEntrega>) => void;
  freteSelecionado: FreteSelecionado | null;
  definirFreteSelecionado: (frete: FreteSelecionado | null) => void;
  /** Fica `true` depois que o cliente confirma os dados; volta a `false` a qualquer edição. */
  confirmado: boolean;
  definirConfirmado: (valor: boolean) => void;
}

const CheckoutContext = createContext<ContextoCheckoutValor | null>(null);

// Guardamos os dados do checkout em Context (não em localStorage) porque,
// diferente do carrinho, essa etapa não precisa sobreviver a um reload de
// página — só precisa persistir entre as páginas de /checkout enquanto o
// visitante navega dentro do fluxo de compra.
export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [tipoCliente, setTipoCliente] = useState<TipoClienteCheckout>("PF");
  const [dadosPF, setDadosPF] = useState<DadosPF>(dadosPFIniciais);
  const [dadosPJ, setDadosPJ] = useState<DadosPJ>(dadosPJIniciais);
  const [endereco, setEndereco] = useState<EnderecoEntrega>(enderecoInicial);
  const [freteSelecionado, definirFreteSelecionado] = useState<FreteSelecionado | null>(null);
  const [confirmado, definirConfirmado] = useState(false);

  const valor = useMemo<ContextoCheckoutValor>(
    () => ({
      tipoCliente,
      definirTipoCliente: (tipo) => {
        setTipoCliente(tipo);
        definirConfirmado(false);
      },
      dadosPF,
      atualizarDadosPF: (dados) => {
        setDadosPF((atual) => ({ ...atual, ...dados }));
        definirConfirmado(false);
      },
      dadosPJ,
      atualizarDadosPJ: (dados) => {
        setDadosPJ((atual) => ({ ...atual, ...dados }));
        definirConfirmado(false);
      },
      endereco,
      atualizarEndereco: (dados) => {
        setEndereco((atual) => ({ ...atual, ...dados }));
        definirConfirmado(false);
      },
      freteSelecionado,
      definirFreteSelecionado,
      confirmado,
      definirConfirmado,
    }),
    [tipoCliente, dadosPF, dadosPJ, endereco, freteSelecionado, confirmado],
  );

  return <CheckoutContext.Provider value={valor}>{children}</CheckoutContext.Provider>;
}

export function useCheckout(): ContextoCheckoutValor {
  const contexto = useContext(CheckoutContext);
  if (!contexto) {
    throw new Error("useCheckout precisa ser usado dentro de um <CheckoutProvider>.");
  }
  return contexto;
}
