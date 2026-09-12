"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { useCarrinho } from "@/lib/carrinho/contexto";
import { useCheckout } from "@/lib/checkout/contexto";
export const moeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function ResumoPedido({
  children,
  mostrarProdutos = false,
}: {
  children?: ReactNode;
  mostrarProdutos?: boolean;
}) {
  const { itens, subtotal, quantidadeTotal } = useCarrinho();
  const resumoRef = useRef<HTMLElement>(null);
  const [acompanha, setAcompanha] = useState(false);
  useEffect(() => {
    const elemento = resumoRef.current;
    if (!elemento) return;
    const medir = () =>
      setAcompanha(
        elemento.getBoundingClientRect().height + 64 < window.innerHeight,
      );
    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(elemento);
    window.addEventListener("resize", medir);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, []);
  const { freteSelecionado } = useCheckout();
  return (
    <aside
      ref={resumoRef}
      className={"order-summary" + (!acompanha ? " summary-expanded" : "")}
      aria-labelledby="summary-heading"
    >
      <h2 id="summary-heading">Resumo do pedido</h2>
      {mostrarProdutos && (
        <ul className="summary-products">
          {itens.map((i) => (
            <li key={i.produtoId}>
              <span>
                {i.quantidade} × {i.nome}
              </span>
              <span>{moeda(i.preco * i.quantidade)}</span>
            </li>
          ))}
        </ul>
      )}
      <dl className="summary-details">
        <div>
          <dt>
            Subtotal{" "}
            <span>
              ({quantidadeTotal}{" "}
              {quantidadeTotal === 1 ? "unidade" : "unidades"})
            </span>
          </dt>
          <dd>{moeda(subtotal)}</dd>
        </div>
        <div>
          <dt>Frete</dt>
          <dd className={freteSelecionado ? "" : "shipping-pending"}>
            {freteSelecionado ? moeda(freteSelecionado.valor) : "A calcular"}
          </dd>
        </div>
      </dl>
      <div className="summary-total">
        <span>
          {freteSelecionado ? "Total do pedido" : "Total em produtos"}
        </span>
        <strong aria-live="polite">
          {moeda(subtotal + (freteSelecionado?.valor ?? 0))}
        </strong>
      </div>
      <p className="total-caption">
        {freteSelecionado
          ? freteSelecionado.transportadora + " · " + freteSelecionado.nome
          : "O valor do frete será somado ao total."}
      </p>
      {children}
      <div className="summary-note">
        <LockKeyhole size={16} strokeWidth={1.5} />
        <p>
          {mostrarProdutos
            ? "Preços, estoque e frete serão conferidos ao finalizar."
            : "Confira seu pedido antes de prosseguir."}
          <br />
          {mostrarProdutos
            ? "A confirmação depende do pagamento."
            : "Nenhuma cobrança é feita nesta etapa."}
        </p>
      </div>
    </aside>
  );
}
