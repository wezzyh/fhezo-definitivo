"use client";

// Cadastro de cliente em etapas. Um único formulário (react-hook-form)
// abrange todas as etapas — voltar nunca perde o que foi digitado — e o
// resolver valida só a etapa atual (esquemaDaEtapa), chamado via `trigger`
// ao tentar avançar. A revisão valida o cadastro inteiro (esquemaCadastro),
// que o servidor revalida de novo em criarContaCliente.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  esquemaCadastro,
  esquemaDaEtapa,
  etapaDoCampo,
  etapasDoTipo,
  valoresIniciaisCadastro,
  type IdEtapa,
  type ValoresFormularioCadastro,
} from "@/lib/clientes/cadastro/esquemas";
import { apagarRascunho, lerRascunho, salvarRascunho } from "@/lib/clientes/cadastro/rascunho";
import type { TipoPessoa } from "@/types/database";
import { criarContaCliente } from "./actions";
import type { NomeCampo } from "./campos";
import { ConfirmeSeuEmail } from "./confirme-email";
import { EtapaAcesso } from "./etapa-acesso";
import { EtapaEndereco } from "./etapa-endereco";
import { EtapaFiscal } from "./etapa-fiscal";
import { EtapaIdentificacao } from "./etapa-identificacao";
import { EtapaRevisao } from "./etapa-revisao";
import { IndicadorEtapas, TITULOS_ETAPAS } from "./indicador-etapas";

/** Grupos de campos que `trigger` revalida ao sair de cada etapa. */
function camposDaEtapa(etapa: IdEtapa, tipo: TipoPessoa): NomeCampo[] {
  switch (etapa) {
    case "acesso":
      return ["tipo", "acesso"];
    case "identificacao":
      return [tipo === "PJ" ? "pj" : "pf"];
    case "fiscal":
      return ["fiscal", "pj.inscricaoEstadual"];
    case "endereco":
      return ["endereco", "entregaDiferente", "entrega", "fiscal.inscricaoSuframa", "pj.inscricaoEstadual"];
    case "revisao":
      return [];
  }
}

function subtituloDaEtapa(etapa: IdEtapa, tipo: TipoPessoa): string {
  switch (etapa) {
    case "acesso":
      return "Escolha o tipo de conta e defina seu acesso.";
    case "identificacao":
      return tipo === "PJ" ? "Dados da empresa." : "Seus dados pessoais.";
    case "fiscal":
      return "Usados na emissão da nota fiscal.";
    case "endereco":
      return "Usado na nota fiscal e na entrega dos pedidos.";
    case "revisao":
      return "Confira tudo antes de criar a conta.";
  }
}

/** Espera o React aplicar a renderização da troca de etapa antes de mexer no foco. */
function depoisDoRender(acao: () => void) {
  requestAnimationFrame(() => requestAnimationFrame(acao));
}

const SELETOR_PRIMEIRO_ERRO = '[aria-invalid="true"], [data-erro-foco]';

export function AssistenteCadastro({ proximo }: { proximo: string }) {
  const router = useRouter();
  const etapaAtualRef = useRef<IdEtapa>("acesso");

  const resolver = useCallback<Resolver<ValoresFormularioCadastro>>(
    (valores, contexto, opcoes) =>
      zodResolver(
        esquemaDaEtapa[etapaAtualRef.current] as unknown as z.ZodType<
          ValoresFormularioCadastro,
          ValoresFormularioCadastro
        >,
      )(valores, contexto, opcoes),
    [],
  );

  const form = useForm<ValoresFormularioCadastro>({
    defaultValues: valoresIniciaisCadastro,
    resolver,
    mode: "onTouched",
  });
  const { control, getValues, reset, setError, trigger } = form;

  const tipo = useWatch({ control, name: "tipo" });
  const etapas = etapasDoTipo(tipo);
  const [etapa, setEtapa] = useState<IdEtapa>("acesso");
  const indice = Math.max(etapas.indexOf(etapa), 0);

  const [anuncio, setAnuncio] = useState("");
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const [emailParaConfirmar, setEmailParaConfirmar] = useState<string | null>(null);
  const [rascunhoRecuperado, setRascunhoRecuperado] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const rascunho = lerRascunho();
    if (rascunho) {
      reset(rascunho);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage só existe no navegador; ler no primeiro render quebraria a hidratação (o servidor sempre renderiza o formulário vazio).
      setRascunhoRecuperado(true);
    }
    return form.subscribe({
      formState: { values: true },
      callback: ({ values }) => salvarRascunho(values),
    });
  }, [form, reset]);

  /** Anuncia na região aria-live; zera antes para repetir a mesma frase ser lida de novo. */
  function anunciar(mensagem: string) {
    setAnuncio("");
    depoisDoRender(() => setAnuncio(mensagem));
  }

  function irParaEtapa(destino: IdEtapa, opcoes: { focarErro?: boolean } = {}) {
    etapaAtualRef.current = destino;
    setEtapa(destino);
    const lista = etapasDoTipo(getValues("tipo"));
    anunciar(`Etapa ${lista.indexOf(destino) + 1} de ${lista.length}: ${TITULOS_ETAPAS[destino]}.`);

    depoisDoRender(() => {
      const campoComErro = opcoes.focarErro
        ? containerRef.current?.querySelector<HTMLElement>(SELETOR_PRIMEIRO_ERRO)
        : null;
      if (campoComErro) {
        campoComErro.focus();
      } else {
        tituloRef.current?.focus({ preventScroll: true });
        containerRef.current?.scrollIntoView({ block: "start" });
      }
    });
  }

  function focarPrimeiroErro(mensagem: string) {
    anunciar(mensagem);
    depoisDoRender(() => containerRef.current?.querySelector<HTMLElement>(SELETOR_PRIMEIRO_ERRO)?.focus());
  }

  /** Aplica erros vindos da validação completa (ou do servidor) e leva o usuário à etapa do primeiro. */
  function aplicarErros(erros: { caminho: string; mensagem: string }[]) {
    if (erros.length === 0) return;
    const aplicados = new Set<string>();
    for (const { caminho, mensagem } of erros) {
      if (aplicados.has(caminho)) continue;
      aplicados.add(caminho);
      setError(caminho as NomeCampo, { type: "manual", message: mensagem });
    }
    const primeiro = erros[0];
    irParaEtapa(etapaDoCampo(primeiro.caminho.split(".")), { focarErro: true });
    anunciar(`Revise este dado: ${primeiro.mensagem}`);
  }

  async function criarConta() {
    if (enviandoRef.current) return; // duplo clique / Enter repetido

    const valores = getValues();
    const validacao = esquemaCadastro.safeParse(valores);
    if (!validacao.success) {
      aplicarErros(
        validacao.error.issues.map((issue) => ({ caminho: issue.path.map(String).join("."), mensagem: issue.message })),
      );
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    let concluido = false;
    try {
      const resposta = await criarContaCliente(valores, proximo);
      if (resposta.errosCampos) {
        aplicarErros(Object.entries(resposta.errosCampos).map(([caminho, mensagem]) => ({ caminho, mensagem })));
        return;
      }
      if (resposta.erro) {
        setErroGeral(resposta.erro);
        anunciar(resposta.erro);
        return;
      }

      concluido = true;
      apagarRascunho();
      if (resposta.confirmarEmail) {
        setEmailParaConfirmar(valores.acesso.email.trim());
        return;
      }
      router.replace(resposta.destino ?? "/conta");
      router.refresh();
    } catch {
      const mensagem = "Não foi possível criar sua conta agora. Verifique sua conexão e tente de novo.";
      setErroGeral(mensagem);
      anunciar(mensagem);
    } finally {
      // Depois de sucesso o botão continua travado até a página trocar.
      if (!concluido) {
        enviandoRef.current = false;
        setEnviando(false);
      }
    }
  }

  async function avancar() {
    setErroGeral(null);
    if (etapa === "revisao") {
      await criarConta();
      return;
    }

    const valida = await trigger(camposDaEtapa(etapa, getValues("tipo")));
    if (!valida) {
      focarPrimeiroErro("Há dados para corrigir nesta etapa.");
      return;
    }
    irParaEtapa(etapas[indice + 1]);
  }

  function comecarDoZero() {
    apagarRascunho();
    reset(valoresIniciaisCadastro);
    setRascunhoRecuperado(false);
    irParaEtapa("acesso");
  }

  if (emailParaConfirmar) {
    return <ConfirmeSeuEmail email={emailParaConfirmar} />;
  }

  return (
    <FormProvider {...form}>
      <div ref={containerRef} className="scroll-mt-24">
        <p className="sr-only" role="status" aria-live="polite">
          {anuncio}
        </p>

        {rascunhoRecuperado && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-x-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-muted">
            <span className="py-2">
              Recuperamos o que você já tinha preenchido. Por segurança, digite a senha de novo.
            </span>
            <button
              type="button"
              onClick={comecarDoZero}
              className="min-h-11 font-medium text-brand-green hover:underline"
            >
              Começar do zero
            </button>
          </div>
        )}

        <IndicadorEtapas etapas={etapas} atual={indice} aoIrPara={(destino) => irParaEtapa(destino)} />

        <form
          noValidate
          className="mt-6"
          onSubmit={(evento) => {
            evento.preventDefault();
            void avancar();
          }}
        >
          <h2 ref={tituloRef} tabIndex={-1} className="text-lg font-semibold text-ink outline-none">
            {TITULOS_ETAPAS[etapa]}
          </h2>
          <p className="mt-1 text-sm text-muted">{subtituloDaEtapa(etapa, tipo)}</p>

          <div className="mt-5">
            {etapa === "acesso" && <EtapaAcesso />}
            {etapa === "identificacao" && <EtapaIdentificacao />}
            {etapa === "fiscal" && <EtapaFiscal />}
            {etapa === "endereco" && (
              <EtapaEndereco aoCorrigirIe={() => irParaEtapa("identificacao", { focarErro: true })} />
            )}
            {etapa === "revisao" && <EtapaRevisao aoEditar={(destino) => irParaEtapa(destino)} />}
          </div>

          {erroGeral && (
            <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {erroGeral}
            </p>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {indice > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="min-h-11"
                disabled={enviando}
                onClick={() => irParaEtapa(etapas[indice - 1])}
              >
                Voltar
              </Button>
            ) : (
              <span className="hidden sm:block" />
            )}
            <Button type="submit" variant="primary" size="lg" className="min-h-11" loading={enviando}>
              {etapa === "revisao" ? (enviando ? "Criando conta..." : "Criar conta") : "Continuar"}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Já tem conta?{" "}
          <Link
            href={`/login?proximo=${encodeURIComponent(proximo)}`}
            className="font-medium text-brand-green hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </FormProvider>
  );
}
