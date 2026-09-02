"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useCarrinho } from "@/lib/carrinho/contexto";
import { useCheckout } from "@/lib/checkout/contexto";
import { validarCPF, validarCNPJ } from "@/lib/checkout/validar-documento";
import { SecaoTipoCliente } from "./secao-tipo-cliente";
import { SecaoEndereco } from "./secao-endereco";
import { SecaoFrete } from "./secao-frete";
import { ResumoPedido } from "./resumo-pedido";

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PaginaCheckout() {
  const { itens } = useCarrinho();
  const {
    tipoCliente,
    dadosPF,
    dadosPJ,
    endereco,
    confirmado,
    definirConfirmado,
  } = useCheckout();

  const erros = useMemo(() => {
    const lista: string[] = [];

    if (tipoCliente === "PF") {
      if (!dadosPF.nomeCompleto.trim()) lista.push("Informe o nome completo.");
      if (!validarCPF(dadosPF.cpf)) lista.push("Informe um CPF válido.");
      if (!REGEX_EMAIL.test(dadosPF.email)) lista.push("Informe um email válido.");
      if (!dadosPF.telefone.trim()) lista.push("Informe um telefone para contato.");
    } else {
      if (!dadosPJ.razaoSocial.trim()) lista.push("Informe a razão social.");
      if (!validarCNPJ(dadosPJ.cnpj)) lista.push("Informe um CNPJ válido.");
      if (!REGEX_EMAIL.test(dadosPJ.email)) lista.push("Informe um email válido.");
      if (!dadosPJ.telefone.trim()) lista.push("Informe um telefone para contato.");
    }

    if (endereco.cep.replace(/\D/g, "").length !== 8) lista.push("Informe um CEP válido.");
    if (!endereco.rua.trim()) lista.push("Informe a rua.");
    if (!endereco.numero.trim()) lista.push("Informe o número.");
    if (!endereco.bairro.trim()) lista.push("Informe o bairro.");
    if (!endereco.cidade.trim()) lista.push("Informe a cidade.");
    if (!endereco.uf.trim()) lista.push("Selecione o estado (UF).");

    return lista;
  }, [tipoCliente, dadosPF, dadosPJ, endereco]);

  const podeContinuar = erros.length === 0;

  if (itens.length === 0) {
    return (
      <div className="bg-page">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center">
          <p className="text-muted">Seu carrinho está vazio.</p>
          <Link href="/produtos" className="mt-4 inline-block">
            <Button variant="primary">Ver catálogo de produtos</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-2xl font-semibold text-ink">Finalizar compra</h1>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <SecaoTipoCliente />
            <SecaoEndereco />
            <SecaoFrete />

            {confirmado ? (
              <div className="rounded-md border border-brand-green/30 bg-brand-green/10 p-4">
                <p className="font-medium text-brand-green-dark">
                  Dados salvos. A etapa de pagamento será adicionada em breve.
                </p>
              </div>
            ) : (
              <div>
                {erros.length > 0 && (
                  <ul className="mb-4 list-inside list-disc text-sm text-red-600">
                    {erros.map((mensagem) => (
                      <li key={mensagem}>{mensagem}</li>
                    ))}
                  </ul>
                )}
                <Button
                  type="button"
                  variant="primary"
                  disabled={!podeContinuar}
                  onClick={() => definirConfirmado(true)}
                >
                  Continuar para pagamento
                </Button>
              </div>
            )}
          </div>

          <ResumoPedido />
        </div>
      </div>
    </div>
  );
}
