"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, Minus, Plus, Trash2, Truck } from "lucide-react";
import { useCarrinho } from "@/lib/carrinho/contexto";
import type { ItemCarrinho } from "@/lib/carrinho/reducer";
import { useCheckout } from "@/lib/checkout/contexto";
import { formatarCEP } from "@/lib/checkout/formatar";
import { useCatalogoCheckout } from "./catalogo-checkout";
import { SecaoFrete } from "./secao-frete";
import { ResumoPedido, moeda } from "./resumo-pedido";
export default function PaginaCarrinho() {
  const router = useRouter();
  const {
    itens,
    quantidadeTotal,
    hidratado,
    alterarQuantidade,
    removerItem,
    limparCarrinho,
    adicionarItem,
  } = useCarrinho();
  const { endereco, atualizarEndereco, pedidoId, reiniciarCheckout } =
    useCheckout();
  const { verificando, erro, revalidar } = useCatalogoCheckout();
  const [removidos, setRemovidos] = useState<ItemCarrinho[]>([]);
  const [aviso, setAviso] = useState("");
  function remover(id?: string) {
    setRemovidos(id ? itens.filter((i) => i.produtoId === id) : itens);
    if (id) removerItem(id);
    else limparCarrinho();
  }
  function desfazer() {
    removidos.forEach((i) => {
      if (!itens.some((atual) => atual.produtoId === i.produtoId))
        adicionarItem(i, i.quantidade);
    });
    setRemovidos([]);
  }
  function continuar() {
    if (pedidoId) reiniciarCheckout();
    router.push("/checkout/identificacao");
  }
  const semEstoque = itens.some((i) => i.estoque < i.quantidade);
  if (!hidratado)
    return (
      <p className="form-message" role="status">
        Carregando carrinho...
      </p>
    );
  if (!itens.length)
    return (
      <section className="empty-cart" aria-live="polite">
        <p className="eyebrow">CARRINHO VAZIO</p>
        <h2>Seu carrinho está vazio.</h2>
        <p>Não há produtos no seu pedido.</p>
        {removidos.length > 0 && (
          <button type="button" className="secondary-button" onClick={desfazer}>
            Desfazer remoção
          </button>
        )}
        <div>
          <Link className="back-link" href="/produtos">
            Ver catálogo de produtos
          </Link>
        </div>
        {pedidoId && (
          <Link
            href={"/checkout/confirmacao?pedido=" + pedidoId}
            className="back-link"
          >
            Acompanhar pedido anterior
          </Link>
        )}
      </section>
    );
  return (
    <div className="checkout-layout">
      <div className="cart-content">
        <div className="section-heading">
          <h2>Produtos</h2>
          <span>
            {quantidadeTotal} {quantidadeTotal === 1 ? "unidade" : "unidades"}
          </span>
        </div>
        {removidos.length > 0 && (
          <div className="removal-notice" role="status">
            <span>
              {removidos.length === 1 ? "Produto removido." : "Carrinho limpo."}
            </span>
            <button type="button" className="text-button" onClick={desfazer}>
              Desfazer
            </button>
          </div>
        )}
        {verificando && (
          <p className="form-message" role="status">
            Conferindo preços e estoque...
          </p>
        )}
        {erro && (
          <p className="form-message is-error" role="alert">
            {erro}{" "}
            <button className="text-button" onClick={revalidar}>
              Tentar novamente
            </button>
          </p>
        )}
        <table className="product-table">
          <caption className="sr-only">Produtos no carrinho</caption>
          <thead>
            <tr>
              <th scope="col">Produto</th>
              <th scope="col">Quantidade</th>
              <th scope="col">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.produtoId}>
                <td className="product-cell">
                  <div className="product-details">
                    {item.imagemUrl ? (
                      <Image
                        src={item.imagemUrl}
                        alt=""
                        width={76}
                        height={88}
                        className="product-image"
                      />
                    ) : (
                      <div className="product-reference" aria-hidden="true">
                        <span>
                          {item.sku.length > 15
                            ? item.sku.slice(0, 12) + "…"
                            : item.sku}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="product-category">{item.sku}</p>
                      <h3>{item.nome}</h3>
                      <p className="unit-price">
                        {moeda(item.preco)} <span>/ unidade</span>
                      </p>
                      <p
                        className={
                          "stock-label" +
                          (item.quantidade > item.estoque ? " stock-error" : "")
                        }
                      >
                        {item.estoque > 0 ? (
                          <>
                            <Check size={13} />
                            {item.estoque} peças em estoque
                          </>
                        ) : (
                          "Produto indisponível"
                        )}
                        {item.quantidade > item.estoque && item.estoque > 0
                          ? " · Ajuste a quantidade"
                          : ""}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="quantity-cell">
                  <span className="mobile-label">Quantidade</span>
                  <div
                    className="quantity-control"
                    role="group"
                    aria-label={"Quantidade de " + item.nome}
                  >
                    <button
                      type="button"
                      disabled={item.quantidade <= 1}
                      onClick={() =>
                        alterarQuantidade(item.produtoId, item.quantidade - 1)
                      }
                      aria-label={"Diminuir quantidade de " + item.nome}
                    >
                      <Minus size={14} />
                    </button>
                    <output
                      aria-live="polite"
                      aria-label={"Quantidade de " + item.nome}
                    >
                      {item.quantidade}
                    </output>
                    <button
                      type="button"
                      disabled={
                        verificando || !!erro || item.quantidade >= item.estoque
                      }
                      onClick={() =>
                        alterarQuantidade(item.produtoId, item.quantidade + 1)
                      }
                      aria-label={"Aumentar quantidade de " + item.nome}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </td>
                <td className="price-cell">
                  <span className="mobile-label">Subtotal</span>
                  <strong>{moeda(item.preco * item.quantidade)}</strong>
                  <button
                    type="button"
                    className="text-button remove-button"
                    onClick={() => remover(item.produtoId)}
                    aria-label={"Remover " + item.nome}
                  >
                    <Trash2 size={13} /> Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="cart-utility">
          <p>Valores atualizados automaticamente.</p>
          <button
            type="button"
            className="text-button"
            onClick={() => remover()}
          >
            Limpar carrinho
          </button>
        </div>
        <section
          className="shipping-section"
          aria-labelledby="shipping-heading"
        >
          <div className="shipping-heading">
            <Truck size={20} strokeWidth={1.5} />
            <h2 id="shipping-heading">Entrega</h2>
          </div>
          <p>Informe seu CEP para consultar as opções de envio.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAviso(
                endereco.cep.replace(/\D/g, "").length !== 8 ||
                  endereco.cep === "00000-000"
                  ? "Informe um CEP válido com 8 dígitos."
                  : "",
              );
            }}
            noValidate
          >
            <label htmlFor="shipping-cep">CEP de destino</label>
            <div className="shipping-input-row">
              <input
                id="shipping-cep"
                autoComplete="postal-code"
                inputMode="numeric"
                placeholder="00000-000"
                maxLength={9}
                value={endereco.cep}
                aria-invalid={!!aviso}
                aria-describedby={aviso ? "cep-aviso" : undefined}
                onChange={(e) => {
                  atualizarEndereco({ cep: formatarCEP(e.target.value) });
                  setAviso("");
                }}
              />
              <button type="submit" className="secondary-button">
                Calcular
              </button>
            </div>
            {aviso && (
              <p id="cep-aviso" className="form-message is-error" role="alert">
                {aviso}
              </p>
            )}
          </form>
          <SecaoFrete />
          <a
            className="postal-link"
            href="https://buscacepinter.correios.com.br/app/endereco/index.php"
            target="_blank"
            rel="noreferrer"
          >
            Não sei meu CEP <ArrowRight size={13} />
          </a>
        </section>
        <Link href="/produtos" className="back-link">
          Continuar comprando
        </Link>
      </div>
      <ResumoPedido>
        <button
          className="checkout-button"
          type="button"
          disabled={verificando || !!erro || semEstoque}
          onClick={continuar}
        >
          Continuar pedido <ArrowRight size={17} />
        </button>
        {semEstoque && (
          <p className="action-error" role="alert">
            Ajuste ou remova os produtos sem estoque suficiente.
          </p>
        )}
        <p className="next-step">Próxima etapa: identificação</p>
      </ResumoPedido>
    </div>
  );
}
