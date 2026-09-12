"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useCarrinho } from "@/lib/carrinho/contexto";
import { useCheckout } from "@/lib/checkout/contexto";
import { useCatalogoCheckout } from "../catalogo-checkout";
import { ResumoPedido, moeda } from "../resumo-pedido";
import { criarPedido } from "./actions";
import { FormularioCartao } from "./formulario-cartao";
import { esquemaPagamentoCartao } from "@/lib/pagamento/dados-cartao";
export default function Pagamento() {
  const router = useRouter();
  const { itens, subtotal, limparCarrinho, hidratado } = useCarrinho();
  const checkout = useCheckout();
  const { verificando, erro: erroCatalogo, revalidar } = useCatalogoCheckout();
  const [enviando, setEnviando] = useState(false),
    [erro, setErro] = useState<string | null>(null);
  const trava = useRef(false);
  const formulario = useRef<HTMLFormElement>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const conectarFormulario = useCallback((elemento: HTMLFormElement | null) => {
    formulario.current = elemento;
    if (!elemento) return;
    return () => {
      elemento
        .querySelectorAll<HTMLInputElement>(".card-fields input")
        .forEach((campo) => {
          campo.value = "";
        });
      formulario.current = null;
    };
  }, []);
  function limparCartao() {
    formulario.current
      ?.querySelectorAll<HTMLInputElement>(".card-fields input")
      .forEach((campo) => {
        campo.value = "";
      });
  }
  useEffect(() => {
    window.addEventListener("pagehide", limparCartao);
    return () => window.removeEventListener("pagehide", limparCartao);
  }, []);
  const dadosCompletos =
    checkout.confirmado &&
    !!checkout.clienteId &&
    !!checkout.freteSelecionado &&
    itens.length > 0;
  useEffect(() => {
    if (!hidratado || !checkout.hidratado) return;
    if (checkout.pedidoId) {
      router.replace("/checkout/confirmacao?pedido=" + checkout.pedidoId);
      return;
    }
    if (!dadosCompletos)
      router.replace(itens.length ? "/checkout/identificacao" : "/checkout");
  }, [
    hidratado,
    checkout.hidratado,
    checkout.pedidoId,
    dadosCompletos,
    itens.length,
    router,
  ]);
  async function pagar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      trava.current ||
      bloqueado ||
      !dadosCompletos ||
      !checkout.clienteId ||
      !checkout.freteSelecionado
    )
      return;
    let dadosCartao:
      ReturnType<typeof esquemaPagamentoCartao.parse> | undefined;
    if (checkout.formaPagamento === "cartao") {
      const campos = new FormData(event.currentTarget);
      const ler = (nome: string) => String(campos.get(nome) ?? "");
      const validacao = esquemaPagamentoCartao.safeParse({
        cartao: {
          numero: ler("numeroCartao"),
          nomeImpresso: ler("nomeImpresso"),
          validade: ler("validadeCartao"),
          cvv: ler("cvv"),
        },
        titularCartao: {
          nome: ler("nomeTitular"),
          cpf: ler("cpfTitular"),
          email: ler("emailTitular"),
          telefone: ler("telefoneTitular"),
          cep: ler("cepTitular"),
          numeroEndereco: ler("numeroTitular"),
        },
      });
      if (!validacao.success) {
        setErro(
          "Confira número, nome, validade e código de segurança do cartão e os dados do titular.",
        );
        return;
      }
      dadosCartao = validacao.data;
    }
    trava.current = true;
    setEnviando(true);
    setErro(null);
    try {
      limparCartao();
      const r = await criarPedido({
        ...dadosCartao,
        checkoutId: checkout.checkoutId,
        clienteId: checkout.clienteId,
        tipoCliente: checkout.tipoCliente,
        dadosPF: checkout.dadosPF,
        dadosPJ: checkout.dadosPJ,
        endereco: checkout.endereco,
        freteServicoId: checkout.freteSelecionado.id,
        itens: itens.map((i) => ({
          produtoId: i.produtoId,
          quantidade: i.quantidade,
        })),
        formaPagamento: checkout.formaPagamento,
        totalEsperado:
          Math.round((subtotal + checkout.freteSelecionado.valor) * 100) / 100,
      });
      if (!r.sucesso) {
        setErro(r.mensagem);
        setBloqueado(!!r.bloqueado);
        if (!r.bloqueado) revalidar();
        return;
      }
      checkout.registrarPedido(r.pedidoId);
      limparCarrinho();
      router.push("/checkout/confirmacao?pedido=" + r.pedidoId);
    } catch {
      setBloqueado(true);
      setErro(
        "Não foi possível receber a resposta. Não inicie outra compra; consulte o atendimento com a referência: " +
          checkout.checkoutId,
      );
    } finally {
      dadosCartao = undefined;
      limparCartao();
      trava.current = false;
      setEnviando(false);
    }
  }
  if (!hidratado || !checkout.hidratado || !dadosCompletos || checkout.pedidoId)
    return (
      <p className="form-message" role="status">
        Carregando pagamento...
      </p>
    );
  const nome =
    checkout.tipoCliente === "PF"
      ? checkout.dadosPF.nomeCompleto
      : checkout.dadosPJ.razaoSocial;
  const email =
    checkout.tipoCliente === "PF"
      ? checkout.dadosPF.email
      : checkout.dadosPJ.email;
  const e = checkout.endereco;
  return (
    <form
      ref={conectarFormulario}
      className="checkout-layout"
      onSubmit={pagar}
      noValidate
      autoComplete="off"
    >
      <div className="cart-content">
        <section className="form-section">
          <h2>Forma de pagamento</h2>
          <fieldset disabled={enviando || bloqueado}>
            {(["pix", "boleto", "cartao"] as const).map((forma) => (
              <label key={forma} className="choice-row">
                <input
                  type="radio"
                  name="pagamento"
                  value={forma}
                  checked={checkout.formaPagamento === forma}
                  onChange={() => checkout.definirFormaPagamento(forma)}
                />
                <span>
                  {forma === "pix"
                    ? "Pix"
                    : forma === "boleto"
                      ? "Boleto"
                      : "Cartão de crédito"}
                </span>
              </label>
            ))}
          </fieldset>
          {checkout.formaPagamento === "cartao" ? (
            <FormularioCartao disabled={enviando || bloqueado} />
          ) : (
            <p className="form-message">
              {checkout.formaPagamento === "pix"
                ? "O QR Code e o código copia e cola serão exibidos quando a cobrança for criada."
                : "Após criar o pedido, você poderá abrir o boleto e consultar seu vencimento."}
            </p>
          )}
        </section>
        <section className="form-section">
          <h2>Identificação</h2>
          <div className="review-details">
            <p>{nome}</p>
            <p>{email}</p>
          </div>
          <Link href="/checkout/identificacao" className="back-link">
            Editar identificação
          </Link>
        </section>
        <section className="form-section">
          <h2>Entrega</h2>
          <div className="review-details">
            <p>
              {e.rua}, {e.numero}
              {e.complemento ? ", " + e.complemento : ""}
            </p>
            <p>
              {e.bairro} · {e.cidade} / {e.uf}
            </p>
            <p>CEP {e.cep}</p>
            <p>
              {checkout.freteSelecionado?.transportadora} ·{" "}
              {checkout.freteSelecionado?.nome} ·{" "}
              {checkout.freteSelecionado?.prazoDias} dia(s) útil(eis)
            </p>
          </div>
          <Link href="/checkout/identificacao" className="back-link">
            Editar endereço e frete
          </Link>
        </section>
        <Link href="/checkout/identificacao" className="back-link">
          Voltar à identificação
        </Link>
      </div>
      <ResumoPedido mostrarProdutos>
        <button
          type="submit"
          className="checkout-button"
          disabled={
            enviando ||
            bloqueado ||
            verificando ||
            !!erroCatalogo ||
            itens.some((i) => i.quantidade > i.estoque)
          }
          aria-busy={enviando}
        >
          {enviando
            ? "Processando..."
            : "Finalizar pedido · " +
              moeda(subtotal + (checkout.freteSelecionado?.valor ?? 0))}
          <ArrowRight size={17} />
        </button>
        {erro && (
          <p className="action-error" role="alert">
            {erro}
          </p>
        )}
        {erroCatalogo && (
          <p className="action-error" role="alert">
            {erroCatalogo}{" "}
            <button type="button" className="text-button" onClick={revalidar}>
              Tentar novamente
            </button>
          </p>
        )}
      </ResumoPedido>
    </form>
  );
}
