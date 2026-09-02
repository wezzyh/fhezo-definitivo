"use client";

import { useEffect, useRef, useState } from "react";
import { useCarrinho } from "@/lib/carrinho/contexto";
import { useCheckout } from "@/lib/checkout/contexto";
import { calcularOpcoesFrete, type OpcaoFrete } from "@/lib/frete/melhorenvio";

export function SecaoFrete() {
  const { itens } = useCarrinho();
  const { endereco, freteSelecionado, definirFreteSelecionado } = useCheckout();

  const [opcoes, setOpcoes] = useState<OpcaoFrete[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ultimoCepCalculado = useRef<string | null>(null);

  useEffect(() => {
    const cepLimpo = endereco.cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;
    if (ultimoCepCalculado.current === cepLimpo) return;
    if (itens.length === 0) return;

    ultimoCepCalculado.current = cepLimpo;
    // Indicador de carregamento para uma busca assíncrona disparada pelo CEP —
    // mesmo padrão do exemplo oficial do React para "fetching data in effects".
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    setErro(null);
    setOpcoes(null);
    definirFreteSelecionado(null);

    calcularOpcoesFrete(
      cepLimpo,
      itens.map((item) => ({
        id: item.produtoId,
        larguraCm: item.larguraCm,
        alturaCm: item.alturaCm,
        comprimentoCm: item.comprimentoCm,
        pesoKg: item.pesoKg,
        valorUnitario: item.preco,
        quantidade: item.quantidade,
      })),
    )
      .then((resultado) => {
        if (!resultado.sucesso) {
          setErro(resultado.mensagem);
          return;
        }
        setOpcoes(resultado.opcoes);
      })
      .catch(() => {
        setErro(
          "Não foi possível calcular o frete agora. Você pode continuar e combinar o frete depois.",
        );
      })
      .finally(() => setCarregando(false));
  }, [endereco.cep, itens, definirFreteSelecionado]);

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-ink">Frete</h2>

      {!carregando && !opcoes && !erro && (
        <p className="mt-3 text-sm text-muted">
          Preencha o CEP de entrega para ver as opções de frete.
        </p>
      )}

      {carregando && <p className="mt-3 text-sm text-muted">Calculando opções de frete...</p>}

      {erro && <p className="mt-3 text-sm text-muted">{erro}</p>}

      {opcoes && opcoes.length > 0 && (
        <div className="mt-3 divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
          {opcoes.map((opcao) => (
            <label
              key={opcao.id}
              className="flex cursor-pointer items-center justify-between gap-4 p-4"
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="frete"
                  checked={freteSelecionado?.id === opcao.id}
                  onChange={() => definirFreteSelecionado(opcao)}
                />
                <div>
                  <p className="font-medium text-ink">
                    {opcao.transportadora} — {opcao.nome}
                  </p>
                  <p className="text-xs font-medium text-muted">
                    Prazo estimado: {opcao.prazoDias} dia(s) útil(eis)
                  </p>
                </div>
              </div>
              <p className="font-medium text-ink">
                {opcao.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
