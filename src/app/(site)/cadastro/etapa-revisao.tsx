"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useFormContext } from "react-hook-form";
import type { IdEtapa, ValoresEndereco, ValoresFormularioCadastro } from "@/lib/clientes/cadastro/esquemas";
import {
  ROTULOS_CONTRIBUINTE_ICMS,
  ROTULOS_FINALIDADE_COMPRA,
  ROTULOS_REGIME_TRIBUTARIO,
  ufTemSuframa,
} from "@/lib/clientes/cadastro/regras-fiscais";
import { CampoCaixa } from "./campos";
import { TITULOS_ETAPAS } from "./indicador-etapas";

function formatarData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : "";
}

function linhasEndereco(endereco: ValoresEndereco): string[] {
  const numero = endereco.semNumero ? "S/N" : endereco.numero;
  return [
    [endereco.logradouro, numero, endereco.complemento].filter(Boolean).join(", "),
    [endereco.bairro, [endereco.cidade, endereco.uf].filter(Boolean).join(" – ")].filter(Boolean).join(", "),
    `CEP ${endereco.cep}`,
    endereco.referencia ? `Referência: ${endereco.referencia}` : "",
  ].filter(Boolean);
}

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted">{rotulo}</dt>
      <dd className="mb-2 break-words text-ink sm:mb-0">{children || "—"}</dd>
    </>
  );
}

function SecaoRevisao({
  etapa,
  aoEditar,
  children,
}: {
  etapa: IdEtapa;
  aoEditar: (etapa: IdEtapa) => void;
  children: ReactNode;
}) {
  const titulo = TITULOS_ETAPAS[etapa];
  const idTitulo = `revisao-${etapa}`;
  return (
    <section aria-labelledby={idTitulo} className="rounded-md border border-zinc-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 id={idTitulo} className="text-sm font-semibold text-ink">
          {titulo}
        </h3>
        <button
          type="button"
          onClick={() => aoEditar(etapa)}
          className="min-h-11 px-2 text-sm font-medium text-brand-green hover:underline"
        >
          Editar<span className="sr-only"> {titulo.toLowerCase()}</span>
        </button>
      </div>
      <dl className="mt-1 grid text-sm sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-x-4 sm:gap-y-2">{children}</dl>
    </section>
  );
}

export function EtapaRevisao({ aoEditar }: { aoEditar: (etapa: IdEtapa) => void }) {
  // Nesta etapa só os aceites mudam, então ler uma vez por render basta.
  const { getValues } = useFormContext<ValoresFormularioCadastro>();
  const valores = getValues();
  const ehPJ = valores.tipo === "PJ";

  return (
    <div className="space-y-4">
      <SecaoRevisao etapa="acesso" aoEditar={aoEditar}>
        <Item rotulo="Tipo de conta">{ehPJ ? "Pessoa jurídica" : "Pessoa física"}</Item>
        <Item rotulo="E-mail">{valores.acesso.email}</Item>
        <Item rotulo="Senha">Definida (não é exibida)</Item>
      </SecaoRevisao>

      <SecaoRevisao etapa="identificacao" aoEditar={aoEditar}>
        {ehPJ ? (
          <>
            <Item rotulo="Razão social">{valores.pj.razaoSocial}</Item>
            <Item rotulo="Nome fantasia">{valores.pj.nomeFantasia}</Item>
            <Item rotulo="CNPJ">{valores.pj.cnpj}</Item>
            <Item rotulo="Inscrição estadual">
              {valores.pj.ieIsento ? "Isento" : valores.pj.inscricaoEstadual || "Não informada"}
            </Item>
            <Item rotulo="Telefone comercial">{valores.pj.telefoneComercial}</Item>
            <Item rotulo="Responsável">{valores.pj.responsavelNome}</Item>
          </>
        ) : (
          <>
            <Item rotulo="Nome completo">{valores.pf.nomeCompleto}</Item>
            <Item rotulo="CPF">{valores.pf.cpf}</Item>
            <Item rotulo="Data de nascimento">{formatarData(valores.pf.dataNascimento)}</Item>
            <Item rotulo="Celular">{valores.pf.celular}</Item>
          </>
        )}
      </SecaoRevisao>

      {ehPJ && (
        <SecaoRevisao etapa="fiscal" aoEditar={aoEditar}>
          <Item rotulo="Contribuinte de ICMS">
            {valores.fiscal.contribuinteIcms && ROTULOS_CONTRIBUINTE_ICMS[valores.fiscal.contribuinteIcms]}
          </Item>
          <Item rotulo="Finalidade da compra">
            {valores.fiscal.finalidadeCompra && ROTULOS_FINALIDADE_COMPRA[valores.fiscal.finalidadeCompra]}
          </Item>
          <Item rotulo="Regime tributário">
            {valores.fiscal.regimeTributario && ROTULOS_REGIME_TRIBUTARIO[valores.fiscal.regimeTributario]}
          </Item>
          <Item rotulo="Inscrição municipal">{valores.fiscal.inscricaoMunicipal}</Item>
        </SecaoRevisao>
      )}

      <SecaoRevisao etapa="endereco" aoEditar={aoEditar}>
        <Item rotulo="Cobrança">
          {linhasEndereco(valores.endereco).map((linha) => (
            <span key={linha} className="block">
              {linha}
            </span>
          ))}
        </Item>
        {ehPJ && ufTemSuframa(valores.endereco.uf) && (
          <Item rotulo="Inscrição SUFRAMA">{valores.fiscal.inscricaoSuframa}</Item>
        )}
        <Item rotulo="Entrega">
          {valores.entregaDiferente
            ? linhasEndereco(valores.entrega).map((linha) => (
                <span key={linha} className="block">
                  {linha}
                </span>
              ))
            : "Mesmo endereço de cobrança"}
        </Item>
      </SecaoRevisao>

      <div className="border-t border-zinc-200 pt-3">
        <CampoCaixa
          nome="aceiteTermos"
          rotulo={
            <>
              Li e aceito os{" "}
              <Link
                href="/institucional/termos-de-uso"
                target="_blank"
                className="font-medium text-brand-green underline underline-offset-2"
              >
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link
                href="/institucional/politica-de-privacidade"
                target="_blank"
                className="font-medium text-brand-green underline underline-offset-2"
              >
                Política de Privacidade
              </Link>
              .<span className="sr-only"> Os links abrem em uma nova aba.</span>
            </>
          }
        />
        <CampoCaixa
          nome="aceiteMarketing"
          rotulo={
            <>
              Quero receber ofertas e novidades por e-mail. <span className="text-muted">(opcional)</span>
            </>
          }
        />
      </div>
    </div>
  );
}
