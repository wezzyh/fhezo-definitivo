"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useCarrinho } from "@/lib/carrinho/contexto";
import { useCheckout } from "@/lib/checkout/contexto";
import { errosIdentificacao } from "@/lib/checkout/validar-identificacao";
import {
  carregarIdentificacaoCheckout,
  salvarClienteCheckout,
} from "../actions";
import { SecaoEndereco } from "../secao-endereco";
import { SecaoFrete } from "../secao-frete";
import { ResumoPedido } from "../resumo-pedido";
import { useCatalogoCheckout } from "../catalogo-checkout";
export default function Identificacao() {
  const router = useRouter();
  const { itens, hidratado } = useCarrinho();
  const checkout = useCheckout();
  const { verificando, erro: erroCatalogo, revalidar } = useCatalogoCheckout();
  const [salvando, setSalvando] = useState(false),
    [erros, setErros] = useState<string[]>([]);
  const trava = useRef(false);
  const [conta, setConta] = useState<Awaited<
    ReturnType<typeof carregarIdentificacaoCheckout>
  > | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const { identificarCliente, hidratado: checkoutHidratado } = checkout;
  useEffect(() => {
    if (!checkoutHidratado) return;
    let ativo = true;
    carregarIdentificacaoCheckout()
      .then((r) => {
        if (!ativo) return;
        if (r.sucesso) identificarCliente(r.cliente);
        setConta(r);
      })
      .catch(() => {
        if (ativo)
          setConta({
            sucesso: false,
            login: false,
            mensagem: "Não foi possível carregar sua conta.",
          });
      });
    return () => {
      ativo = false;
    };
  }, [checkoutHidratado, identificarCliente, tentativa]);
  async function continuar(e: React.FormEvent) {
    e.preventDefault();
    if (trava.current) return;
    const lista = errosIdentificacao(checkout);
    if (!checkout.freteSelecionado) lista.push("Selecione uma opção de frete.");
    if (itens.some((i) => i.quantidade > i.estoque))
      lista.push("Ajuste o estoque dos produtos no carrinho.");
    if (lista.length) {
      setErros(lista);
      document.getElementById("erros-identificacao")?.focus();
      return;
    }
    trava.current = true;
    setSalvando(true);
    setErros([]);
    try {
      const r = await salvarClienteCheckout();
      if (!r.sucesso) {
        setErros([r.mensagem]);
        return;
      }
      checkout.definirClienteId(r.clienteId);
      checkout.definirConfirmado(true);
      router.push("/checkout/pagamento");
    } catch {
      setErros(["Não foi possível salvar os dados. Tente novamente."]);
    } finally {
      trava.current = false;
      setSalvando(false);
    }
  }
  if (!hidratado || !checkout.hidratado || !conta)
    return (
      <p className="form-message" role="status">
        Carregando identificação...
      </p>
    );
  if (!itens.length)
    return (
      <section className="empty-cart">
        <h2>Seu carrinho está vazio.</h2>
        <Link href="/checkout" className="back-link">
          Voltar ao carrinho
        </Link>
      </section>
    );
  if (!conta.sucesso)
    return (
      <div className="checkout-layout">
        <section className="cart-content">
          <h2>
            {conta.login
              ? "Identifique-se para continuar"
              : "Complete seu cadastro"}
          </h2>
          <p className="form-message">{conta.mensagem}</p>
          {conta.login ? (
            <>
              <Link
                className="checkout-button account-action"
                href="/cadastro?proximo=%2Fcheckout%2Fidentificacao"
              >
                Criar minha conta <ArrowRight size={17} />
              </Link>
              <Link
                href="/login?proximo=%2Fcheckout%2Fidentificacao"
                className="back-link"
              >
                Já tenho conta · Entrar
              </Link>
            </>
          ) : (
            <>
              <Link href="/conta" className="back-link">
                Minha conta
              </Link>
              <button
                className="text-button"
                onClick={() => setTentativa((t) => t + 1)}
              >
                Tentar novamente
              </button>
            </>
          )}
          <div>
            <Link href="/checkout" className="back-link">
              Voltar ao carrinho
            </Link>
          </div>
        </section>
        <ResumoPedido mostrarProdutos />
      </div>
    );
  return (
    <form className="checkout-layout" onSubmit={continuar} noValidate>
      <div className="cart-content form-fields">
        <fieldset disabled={salvando} className="min-w-0">
          <div className="form-section">
            <h2>Dados do cadastro</h2>
            <dl className="identity-details">
              <div>
                <dt>
                  {checkout.tipoCliente === "PF"
                    ? "Nome completo"
                    : "Razão social"}
                </dt>
                <dd>{conta.cliente.nome}</dd>
              </div>
              <div>
                <dt>{checkout.tipoCliente === "PF" ? "CPF" : "CNPJ"}</dt>
                <dd>{conta.cliente.documento}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{conta.cliente.email}</dd>
              </div>
              <div>
                <dt>Telefone</dt>
                <dd>{conta.cliente.telefone}</dd>
              </div>
            </dl>
            <Link href="/conta" className="back-link">
              Editar dados em Minha conta
            </Link>
          </div>
          <div className="form-section">
            <SecaoEndereco />
          </div>
          <section className="form-section">
            <h2>Entrega</h2>
            <SecaoFrete />
          </section>
        </fieldset>
        <Link href="/checkout" className="back-link">
          Voltar ao carrinho
        </Link>
      </div>
      <ResumoPedido mostrarProdutos>
        <button
          type="submit"
          className="checkout-button"
          disabled={salvando || verificando || !!erroCatalogo}
          aria-busy={salvando}
        >
          {salvando ? "Salvando..." : "Continuar para pagamento"}
          <ArrowRight size={17} />
        </button>
        {erroCatalogo && (
          <p role="alert" className="action-error">
            {erroCatalogo}{" "}
            <button type="button" className="text-button" onClick={revalidar}>
              Tentar novamente
            </button>
          </p>
        )}
        <div id="erros-identificacao" tabIndex={-1}>
          {erros.length > 0 && (
            <ul className="validation-errors" role="alert">
              {erros.map((erro) => (
                <li key={erro}>{erro}</li>
              ))}
            </ul>
          )}
        </div>
        <p className="next-step">Próxima etapa: pagamento</p>
      </ResumoPedido>
    </form>
  );
}
