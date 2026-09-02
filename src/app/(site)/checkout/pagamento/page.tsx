"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCarrinho } from "@/lib/carrinho/contexto";
import { useCheckout } from "@/lib/checkout/contexto";
import { validarNumeroCartao, validarValidadeCartao, validarCvv } from "@/lib/pagamento/validar-cartao";
import type { FormaPagamento } from "@/types/database";
import {
  criarPedido,
  buscarQrCodePagamentoPix,
  verificarStatusPagamento,
  type ResultadoCriarPedido,
} from "./actions";
import { FormularioCartao, type DadosCartaoForm, type DadosTitularForm } from "./formulario-cartao";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const INTERVALO_POLLING_MS = 5000;
const LIMITE_TENTATIVAS_POLLING = 60; // 5 minutos

const cartaoInicial: DadosCartaoForm = { numero: "", nomeImpresso: "", validade: "", cvv: "" };

type ResultadoSucesso = Extract<ResultadoCriarPedido, { sucesso: true }>;

export default function PaginaPagamento() {
  const router = useRouter();
  const { itens, subtotal, limparCarrinho } = useCarrinho();
  const {
    tipoCliente,
    dadosPF,
    dadosPJ,
    endereco,
    freteSelecionado,
    confirmado,
    clienteId,
  } = useCheckout();

  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("pix");
  const [cartao, setCartao] = useState<DadosCartaoForm>(cartaoInicial);
  const [titular, setTitular] = useState<DadosTitularForm>(() => ({
    nome: tipoCliente === "PF" ? dadosPF.nomeCompleto : "",
    cpf: "",
    email: tipoCliente === "PF" ? dadosPF.email : "",
    telefone: tipoCliente === "PF" ? dadosPF.telefone : "",
    cep: "",
  }));

  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoSucesso | null>(null);
  const [pagoConfirmado, setPagoConfirmado] = useState(false);
  const [avisoPolling, setAvisoPolling] = useState<string | null>(null);
  const [carregandoQrCode, setCarregandoQrCode] = useState(false);
  const [qrCodeAtual, setQrCodeAtual] = useState<{ qrCodeBase64: string; copiaECola: string } | null>(
    null,
  );
  const tentativasPolling = useRef(0);
  // Fica `true` assim que criarPedido() retorna sucesso, ANTES de limpar o
  // carrinho — evita que o efeito de "dados incompletos" abaixo confunda o
  // carrinho recém-esvaziado com um checkout abandonado e mande de volta
  // para /checkout no meio da navegação para /checkout/confirmacao
  // (boleto/cartão). Uma ref e não state porque precisa valer já no mesmo
  // re-render dessincronizado que limparCarrinho() dispara, sem esperar
  // outro ciclo de commit.
  const pedidoFinalizadoRef = useRef(false);

  const total = subtotal + (freteSelecionado?.valor ?? 0);

  const dadosCompletos = confirmado && Boolean(clienteId) && Boolean(freteSelecionado) && itens.length > 0;

  // Depois que o pedido é criado (`resultado`), o carrinho já foi limpo de
  // propósito — não deve mais disparar o redirecionamento de "dados
  // incompletos" enquanto a tela de Pix ainda está aguardando confirmação.
  useEffect(() => {
    if (!dadosCompletos && !resultado && !pedidoFinalizadoRef.current) {
      router.replace("/checkout");
    }
  }, [dadosCompletos, resultado, router]);

  // Polling do status do Pix: consulta o Asaas a cada 5s até confirmar o
  // pagamento, então redireciona para a confirmação.
  useEffect(() => {
    const paymentId = resultado?.pix?.paymentId ?? resultado?.pixIndisponivel?.paymentId;
    if (!paymentId || pagoConfirmado) return;

    const intervalo = setInterval(async () => {
      tentativasPolling.current += 1;

      const status = await verificarStatusPagamento(paymentId);
      if (status.sucesso && status.pago) {
        clearInterval(intervalo);
        setPagoConfirmado(true);
        router.push(`/checkout/confirmacao?pedido=${resultado!.pedidoId}`);
        return;
      }

      if (tentativasPolling.current >= LIMITE_TENTATIVAS_POLLING) {
        clearInterval(intervalo);
        setAvisoPolling(
          "Ainda não identificamos a confirmação do pagamento. Se você já pagou, aguarde alguns instantes e clique em \"Verificar pagamento\" abaixo.",
        );
      }
    }, INTERVALO_POLLING_MS);

    return () => clearInterval(intervalo);
  }, [resultado, pagoConfirmado, router]);

  const errosCartao = useMemo(() => {
    if (formaPagamento !== "cartao") return [];
    const lista: string[] = [];
    if (cartao.numero && !validarNumeroCartao(cartao.numero)) lista.push("Número de cartão inválido.");
    if (cartao.validade && !validarValidadeCartao(cartao.validade)) lista.push("Validade inválida ou vencida.");
    if (cartao.cvv && !validarCvv(cartao.cvv)) lista.push("CVV inválido.");
    return lista;
  }, [formaPagamento, cartao]);

  const podeEnviarCartao =
    formaPagamento !== "cartao" ||
    (cartao.numero &&
      cartao.nomeImpresso.trim() &&
      cartao.validade &&
      cartao.cvv &&
      titular.nome.trim() &&
      titular.cpf.trim() &&
      titular.email.trim() &&
      titular.telefone.trim() &&
      titular.cep.trim() &&
      errosCartao.length === 0);

  async function lidarComVerificarAgora() {
    const paymentId = resultado?.pix?.paymentId ?? resultado?.pixIndisponivel?.paymentId;
    if (!paymentId) return;
    setAvisoPolling(null);
    const status = await verificarStatusPagamento(paymentId);
    if (status.sucesso && status.pago) {
      setPagoConfirmado(true);
      router.push(`/checkout/confirmacao?pedido=${resultado!.pedidoId}`);
    } else if (status.sucesso) {
      setAvisoPolling("Ainda aguardando a confirmação do pagamento.");
    } else {
      setAvisoPolling(status.mensagem);
    }
  }

  async function lidarComTentarQrCodeNovamente() {
    const paymentId = resultado?.pixIndisponivel?.paymentId;
    if (!paymentId) return;
    setCarregandoQrCode(true);
    const qr = await buscarQrCodePagamentoPix(paymentId);
    setCarregandoQrCode(false);
    if (qr.sucesso) {
      setQrCodeAtual({ qrCodeBase64: qr.qrCodeBase64, copiaECola: qr.copiaECola });
    } else {
      setErroEnvio(qr.mensagem);
    }
  }

  async function lidarComPagar() {
    if (!freteSelecionado || !clienteId) return;

    setErroEnvio(null);
    setEnviando(true);

    const resposta = await criarPedido({
      clienteId,
      tipoCliente,
      dadosPF,
      dadosPJ,
      endereco,
      freteSelecionado,
      itens: itens.map((item) => ({ produtoId: item.produtoId, quantidade: item.quantidade })),
      formaPagamento,
      cartao: formaPagamento === "cartao" ? cartao : undefined,
      titularCartao: formaPagamento === "cartao" ? titular : undefined,
    });

    setEnviando(false);

    if (!resposta.sucesso) {
      setErroEnvio(resposta.mensagem);
      return;
    }

    // O pedido já está gravado a partir daqui — o carrinho pode ser limpo
    // independente do pagamento (Pix) ainda estar pendente de confirmação.
    // Marca ANTES de limparCarrinho() para não disparar o redirect de
    // "dados incompletos" no re-render intermediário (ver comentário na
    // declaração de pedidoFinalizadoRef).
    pedidoFinalizadoRef.current = true;
    limparCarrinho();

    if (resposta.formaPagamento !== "pix") {
      router.push(`/checkout/confirmacao?pedido=${resposta.pedidoId}`);
      return;
    }

    if (resposta.pix) {
      setQrCodeAtual({ qrCodeBase64: resposta.pix.qrCodeBase64, copiaECola: resposta.pix.copiaECola });
    }
    setResultado(resposta);
  }

  if (!dadosCompletos && !resultado) {
    return null;
  }

  // Cobrança já criada e é Pix: mostra QR Code + aguarda confirmação.
  if (resultado) {
    return (
      <div className="bg-page">
        <div className="mx-auto max-w-2xl px-4 py-12">
          <h1 className="text-2xl font-semibold text-ink">Pagamento via Pix</h1>
          <p className="mt-1 text-sm text-muted">Pedido #{resultado.numeroPedido}</p>

          <div className="mt-6 rounded-md border border-zinc-200 bg-white p-6 text-center">
            {qrCodeAtual ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- imagem base64 dinâmica do Asaas, não um asset estático */}
                <img
                  src={`data:image/png;base64,${qrCodeAtual.qrCodeBase64}`}
                  alt="QR Code Pix"
                  className="mx-auto h-56 w-56"
                />
                <p className="mt-4 text-sm font-medium text-ink">Código copia e cola</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    readOnly
                    value={qrCodeAtual.copiaECola}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-xs text-muted"
                    onFocus={(evento) => evento.target.select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigator.clipboard?.writeText(qrCodeAtual.copiaECola)}
                  >
                    Copiar
                  </Button>
                </div>
              </>
            ) : (
              <div>
                <p className="text-sm text-muted">
                  Não foi possível carregar o QR Code agora, mas sua cobrança Pix já foi criada.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  disabled={carregandoQrCode}
                  onClick={lidarComTentarQrCodeNovamente}
                >
                  {carregandoQrCode ? "Carregando..." : "Tentar carregar o QR Code novamente"}
                </Button>
              </div>
            )}

            <p className="mt-6 rounded-md bg-zinc-50 px-3 py-2 text-sm font-medium text-muted">
              Aguardando confirmação de pagamento...
            </p>
            {avisoPolling && <p className="mt-2 text-xs text-muted">{avisoPolling}</p>}
            {erroEnvio && <p className="mt-2 text-xs text-red-600">{erroEnvio}</p>}
            <Button type="button" variant="outline" className="mt-3" onClick={lidarComVerificarAgora}>
              Verificar pagamento
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-2xl font-semibold text-ink">Pagamento</h1>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex gap-2">
              {(["pix", "boleto", "cartao"] as FormaPagamento[]).map((forma) => (
                <Button
                  key={forma}
                  type="button"
                  variant={formaPagamento === forma ? "primary" : "outline"}
                  onClick={() => setFormaPagamento(forma)}
                >
                  {forma === "pix" ? "Pix" : forma === "boleto" ? "Boleto" : "Cartão"}
                </Button>
              ))}
            </div>

            {formaPagamento === "pix" && (
              <p className="mt-4 text-sm text-muted">
                Você verá o QR Code e o código copia-e-cola na próxima tela, assim que a cobrança for
                criada. A confirmação costuma ser instantânea.
              </p>
            )}

            {formaPagamento === "boleto" && (
              <p className="mt-4 text-sm text-muted">
                O boleto vence em 3 dias úteis. Você poderá abrir/baixar o PDF e copiar a linha
                digitável na próxima tela.
              </p>
            )}

            {formaPagamento === "cartao" && (
              <FormularioCartao
                cartao={cartao}
                onAlterarCartao={(dados) => setCartao((atual) => ({ ...atual, ...dados }))}
                titular={titular}
                onAlterarTitular={(dados) => setTitular((atual) => ({ ...atual, ...dados }))}
              />
            )}

            <div className="mt-6">
              {errosCartao.length > 0 && (
                <ul className="mb-4 list-inside list-disc text-sm text-red-600">
                  {errosCartao.map((mensagem) => (
                    <li key={mensagem}>{mensagem}</li>
                  ))}
                </ul>
              )}
              {erroEnvio && <p className="mb-4 text-sm text-red-600">{erroEnvio}</p>}
              <Button
                type="button"
                variant="primary"
                disabled={enviando || !podeEnviarCartao}
                onClick={lidarComPagar}
              >
                {enviando ? "Processando..." : `Pagar ${formatarMoeda(total)}`}
              </Button>
            </div>

            <Link
              href="/checkout"
              className="mt-4 inline-block text-sm font-medium text-brand-green hover:underline"
            >
              Voltar para os dados do checkout
            </Link>
          </div>

          <aside className="h-fit rounded-md border border-zinc-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-ink">Resumo do pedido</h2>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-medium text-ink">{formatarMoeda(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Frete ({freteSelecionado?.transportadora})</span>
                <span className="font-medium text-ink">{formatarMoeda(freteSelecionado?.valor ?? 0)}</span>
              </div>
            </div>
            <div className="mt-4 flex justify-between border-t border-zinc-200 pt-4">
              <span className="font-semibold text-ink">Total</span>
              <span className="text-lg font-semibold text-ink">{formatarMoeda(total)}</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
