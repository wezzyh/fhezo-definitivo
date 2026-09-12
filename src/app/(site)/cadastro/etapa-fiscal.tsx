"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { ValoresFormularioCadastro } from "@/lib/clientes/cadastro/esquemas";
import {
  CONTRIBUINTE_ICMS,
  FINALIDADES_COMPRA,
  REGIMES_TRIBUTARIOS,
  ROTULOS_CONTRIBUINTE_ICMS,
  ROTULOS_FINALIDADE_COMPRA,
  ROTULOS_REGIME_TRIBUTARIO,
  regraInscricaoEstadual,
  type ContribuinteIcms,
} from "@/lib/clientes/cadastro/regras-fiscais";
import { CampoTexto, GrupoRadio } from "./campos";

const DESCRICOES_CONTRIBUINTE: Record<ContribuinteIcms, string> = {
  sim: "Tem inscrição estadual ativa e recolhe ICMS.",
  nao: "Não tem inscrição estadual (ex.: prestadora de serviços).",
  isento: "Dispensada de inscrição estadual.",
};

export function EtapaFiscal() {
  const { setValue } = useFormContext<ValoresFormularioCadastro>();
  const contribuinte = useWatch<ValoresFormularioCadastro, "fiscal.contribuinteIcms">({
    name: "fiscal.contribuinteIcms",
  });

  // A dependência entre etapas acontece aqui, na hora da escolha: o
  // checkbox "Isento" da etapa 2 é ajustado e travado conforme a regra
  // (regraInscricaoEstadual é a única definição dela).
  function aoMudarContribuinte(valor: string) {
    const regra = regraInscricaoEstadual(valor as ContribuinteIcms);
    if (regra.checkboxIsento === "travado_desmarcado") {
      setValue("pj.ieIsento", false);
    } else if (regra.checkboxIsento === "travado_marcado") {
      setValue("pj.ieIsento", true);
      setValue("pj.inscricaoEstadual", "");
    }
  }

  return (
    <div className="space-y-6">
      <GrupoRadio
        nome="fiscal.contribuinteIcms"
        legenda="A empresa é contribuinte de ICMS?"
        colunas={3}
        aoMudar={aoMudarContribuinte}
        opcoes={CONTRIBUINTE_ICMS.map((valor) => ({
          valor,
          rotulo: ROTULOS_CONTRIBUINTE_ICMS[valor],
          descricao: DESCRICOES_CONTRIBUINTE[valor],
        }))}
      />

      {/* Contribuinte precisa de IE: o campo (o mesmo da etapa de
          identificação) aparece aqui para ser preenchido sem voltar. */}
      {contribuinte === "sim" && (
        <CampoTexto
          nome="pj.inscricaoEstadual"
          rotulo="Inscrição estadual"
          inputMode="numeric"
          autoComplete="off"
          dica="Obrigatória para contribuinte de ICMS."
        />
      )}

      <GrupoRadio
        nome="fiscal.finalidadeCompra"
        legenda="Finalidade da compra"
        opcoes={FINALIDADES_COMPRA.map((valor) => ({ valor, rotulo: ROTULOS_FINALIDADE_COMPRA[valor] }))}
      />

      <GrupoRadio
        nome="fiscal.regimeTributario"
        legenda="Regime tributário"
        colunas={3}
        opcoes={REGIMES_TRIBUTARIOS.map((valor) => ({ valor, rotulo: ROTULOS_REGIME_TRIBUTARIO[valor] }))}
      />

      <CampoTexto nome="fiscal.inscricaoMunicipal" rotulo="Inscrição municipal" opcional autoComplete="off" />

      <p className="text-xs text-muted">
        Empresas na área da SUFRAMA (AC, AM, AP, RO e RR) informam a inscrição SUFRAMA junto com o endereço.
      </p>
    </div>
  );
}
