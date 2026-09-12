"use client";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { buscarResumoPedido, type ResumoPedidoConfirmacao } from "./actions";
import { TEXTO_STATUS_PEDIDO } from "@/lib/pedidos/status";
import { moeda } from "../resumo-pedido";
export default function Confirmacao() {
  return (
    <Suspense fallback={<p role="status">Carregando pedido...</p>}>
      <Conteudo />
    </Suspense>
  );
}
function Conteudo() {
  const params = useSearchParams(),
    pedidoId = params.get("pedido");
  const [resumo, setResumo] = useState<ResumoPedidoConfirmacao | null>(null),
    [atualizando, setAtualizando] = useState(false),
    [copiado, setCopiado] = useState("");
  const atualizar = useCallback(async () => {
    if (!pedidoId) return;
    setAtualizando(true);
    try {
      setResumo(await buscarResumoPedido(pedidoId));
    } catch {
      setResumo({
        sucesso: false,
        mensagem: "Não foi possível carregar o pedido. Tente novamente.",
      });
    } finally {
      setAtualizando(false);
    }
  }, [pedidoId]);
  useEffect(() => {
    let ativo = true;
    if (pedidoId)
      buscarResumoPedido(pedidoId)
        .then((r) => {
          if (ativo) setResumo(r);
        })
        .catch(() => {
          if (ativo)
            setResumo({
              sucesso: false,
              mensagem: "Não foi possível consultar o pedido.",
            });
        });
    return () => {
      ativo = false;
    };
  }, [pedidoId]);
  const pendente = resumo?.sucesso && resumo.status === "pendente";
  useEffect(() => {
    if (!pendente) return;
    let tentativas = 0,
      executando = false;
    const timer = setInterval(async () => {
      if (executando) return;
      if (++tentativas > 60) {
        clearInterval(timer);
        return;
      }
      executando = true;
      await atualizar();
      executando = false;
    }, 10000);
    return () => clearInterval(timer);
  }, [pendente, atualizar]);
  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado("Código copiado.");
    } catch {
      setCopiado("Selecione o código e copie manualmente.");
    }
  }
  if (!pedidoId) return <p className="form-message">Pedido não informado.</p>;
  if (!resumo)
    return (
      <p className="form-message" role="status">
        Carregando pedido...
      </p>
    );
  if (!resumo.sucesso)
    return (
      <section className="empty-cart">
        <p role="alert">{resumo.mensagem}</p>
        <Link
          className="back-link"
          href={
            "/login?proximo=" +
            encodeURIComponent("/checkout/confirmacao?pedido=" + pedidoId)
          }
        >
          Entrar na minha conta
        </Link>
        <button
          className="secondary-button"
          disabled={atualizando}
          onClick={atualizar}
        >
          Tentar novamente
        </button>
      </section>
    );
  const forma =
    resumo.formaPagamento === "pix"
      ? "Pix"
      : resumo.formaPagamento === "boleto"
        ? "Boleto"
        : "Cartão de crédito";
  return (
    <div className="checkout-layout">
      <div className="cart-content">
        <section className="form-section">
          <h2>
            {resumo.status === "pago"
              ? "Pagamento confirmado"
              : resumo.status === "cancelado"
                ? "Pedido cancelado"
                : "Pedido registrado"}
          </h2>
          <p className="form-message">
            Número do pedido: #{resumo.numeroPedido}
          </p>
          <div className="payment-status" role="status">
            <p>{TEXTO_STATUS_PEDIDO[resumo.status] ?? resumo.status}</p>
            {pendente && (
              <p className="form-message">
                Aguardando a confirmação do pagamento por {forma}.
              </p>
            )}
          </div>
          {resumo.aviso && (
            <p className="form-message" role="status">
              {resumo.aviso}
            </p>
          )}
          {resumo.pix && (
            <>
              <Image
                className="qr-code"
                unoptimized
                src={"data:image/png;base64," + resumo.pix.qrCodeBase64}
                alt="QR Code para pagamento via Pix"
                width={224}
                height={224}
              />
              <label htmlFor="codigo-pix">Código Pix copia e cola</label>
              <input
                id="codigo-pix"
                className="payment-code"
                readOnly
                value={resumo.pix.copiaECola}
                onFocus={(e) => e.target.select()}
              />
              <button
                className="text-button"
                onClick={() => copiar(resumo.pix!.copiaECola)}
              >
                Copiar código Pix
              </button>
            </>
          )}
          {resumo.boleto && (
            <>
              <p className="form-message">Confira o vencimento no boleto.</p>
              {resumo.boleto.linhaDigitavel && (
                <>
                  <label htmlFor="codigo-boleto">Linha digitável</label>
                  <input
                    id="codigo-boleto"
                    className="payment-code"
                    readOnly
                    value={resumo.boleto.linhaDigitavel}
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    className="text-button"
                    onClick={() => copiar(resumo.boleto!.linhaDigitavel!)}
                  >
                    Copiar linha digitável
                  </button>
                </>
              )}
              <a
                href={resumo.boleto.url}
                target="_blank"
                rel="noopener noreferrer"
                className="checkout-button"
              >
                Abrir boleto
              </a>
            </>
          )}
          {copiado && (
            <p role="status" className="form-message">
              {copiado}
            </p>
          )}
          <button
            type="button"
            className="secondary-button mt-6"
            disabled={atualizando}
            onClick={atualizar}
          >
            {atualizando ? "Consultando..." : "Atualizar pagamento"}
          </button>
        </section>
        <Link href="/produtos" className="back-link">
          Continuar comprando
        </Link>
      </div>
      <aside className="order-summary summary-expanded">
        <h2>Resumo do pedido</h2>
        <ul className="summary-products">
          {resumo.itens.map((i, index) => (
            <li key={index}>
              <span>
                {i.quantidade} × {i.nome}
              </span>
              <span>{moeda(i.preco * i.quantidade)}</span>
            </li>
          ))}
        </ul>
        <dl className="summary-details">
          <div>
            <dt>Subtotal</dt>
            <dd>{moeda(resumo.total - resumo.freteValor)}</dd>
          </div>
          <div>
            <dt>Frete</dt>
            <dd>{moeda(resumo.freteValor)}</dd>
          </div>
          <div>
            <dt>Pagamento</dt>
            <dd>{forma}</dd>
          </div>
        </dl>
        <div className="summary-total">
          <span>Total do pedido</span>
          <strong>{moeda(resumo.total)}</strong>
        </div>
        <p className="total-caption">{resumo.freteTransportadora}</p>
      </aside>
    </div>
  );
}
