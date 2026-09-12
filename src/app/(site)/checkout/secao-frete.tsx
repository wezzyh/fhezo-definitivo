"use client";
import { useEffect, useState } from "react";
import { useCarrinho } from "@/lib/carrinho/contexto";
import { useCheckout } from "@/lib/checkout/contexto";
import { cotarFreteCheckout } from "./catalogo-actions";
import type { FreteSelecionado } from "@/lib/checkout/tipos";
import { moeda } from "./resumo-pedido";
export function SecaoFrete() {
  const { itens, hidratado } = useCarrinho();
  const { endereco, freteSelecionado, definirFreteSelecionado } = useCheckout();
  const [resultado, setResultado] = useState<{
    chave: string;
    opcoes: FreteSelecionado[];
    erro: string | null;
  }>({ chave: "", opcoes: [], erro: null });
  const [tentativa, setTentativa] = useState(0);
  const entrada = JSON.stringify(
    itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
  );
  const cep = endereco.cep.replace(/\D/g, "");
  const chave = cep + entrada + tentativa;
  const valido = /^\d{8}$/.test(cep) && cep !== "00000000" && itens.length > 0;
  const selecionadoId = freteSelecionado?.id;
  useEffect(() => {
    if (!hidratado || !valido || selecionadoId !== undefined) return;
    let ativo = true;
    cotarFreteCheckout(cep, JSON.parse(entrada))
      .then((r) => {
        if (ativo)
          setResultado({
            chave,
            opcoes: r.sucesso ? r.opcoes : [],
            erro: r.sucesso ? null : r.mensagem,
          });
      })
      .catch(() => {
        if (ativo)
          setResultado({
            chave,
            opcoes: [],
            erro: "Não foi possível calcular o frete. Tente novamente.",
          });
      });
    return () => {
      ativo = false;
    };
  }, [cep, entrada, chave, hidratado, valido, selecionadoId]);
  const atual = resultado.chave === chave;
  const opcoes =
    atual && resultado.opcoes.length
      ? resultado.opcoes
      : freteSelecionado
        ? [freteSelecionado]
        : [];
  return (
    <section
      className="shipping-options"
      aria-label="Opções de frete"
      aria-busy={valido && !atual && !freteSelecionado}
    >
      {!valido && (
        <p className="form-message">
          Informe um CEP válido para consultar as opções de envio.
        </p>
      )}
      {valido && !atual && !freteSelecionado && (
        <p role="status" className="form-message">
          Calculando opções de frete...
        </p>
      )}
      {atual && resultado.erro && (
        <>
          <p className="form-message is-error" role="alert">
            {resultado.erro}
          </p>
          <button
            className="text-button"
            type="button"
            onClick={() => setTentativa((t) => t + 1)}
          >
            Tentar novamente
          </button>
        </>
      )}
      {valido &&
        opcoes.map((opcao) => (
          <label className="choice-row" key={opcao.id}>
            <input
              type="radio"
              name="frete"
              checked={freteSelecionado?.id === opcao.id}
              onChange={() => definirFreteSelecionado(opcao)}
            />
            <span>
              {opcao.transportadora} — {opcao.nome}
              <small>Prazo estimado: {opcao.prazoDias} dia(s) útil(eis)</small>
            </span>
            <strong>{moeda(opcao.valor)}</strong>
          </label>
        ))}
      {freteSelecionado && (
        <button
          type="button"
          className="text-button"
          onClick={() => {
            definirFreteSelecionado(null);
            setTentativa((t) => t + 1);
          }}
        >
          Recalcular opções de entrega
        </button>
      )}
    </section>
  );
}
