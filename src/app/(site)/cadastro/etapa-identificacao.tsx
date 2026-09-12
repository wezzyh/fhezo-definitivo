"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { buscarDadosPorCnpj } from "@/lib/checkout/brasilapi-cnpj";
import { formatarCEP, formatarCNPJ, formatarCPF, formatarTelefone } from "@/lib/checkout/formatar";
import { validarCNPJ } from "@/lib/checkout/validar-documento";
import type { ValoresFormularioCadastro } from "@/lib/clientes/cadastro/esquemas";
import { ehUf, regraInscricaoEstadual } from "@/lib/clientes/cadastro/regras-fiscais";
import { CampoCaixa, CampoTexto } from "./campos";

export function EtapaIdentificacao() {
  const tipo = useWatch<ValoresFormularioCadastro, "tipo">({ name: "tipo" });
  return tipo === "PJ" ? <IdentificacaoPJ /> : <IdentificacaoPF />;
}

function IdentificacaoPF() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CampoTexto className="sm:col-span-2" nome="pf.nomeCompleto" rotulo="Nome completo" autoComplete="name" />
      <CampoTexto
        nome="pf.cpf"
        rotulo="CPF"
        inputMode="numeric"
        autoComplete="off"
        placeholder="000.000.000-00"
        mascara={formatarCPF}
      />
      <CampoTexto
        nome="pf.dataNascimento"
        rotulo="Data de nascimento"
        type="date"
        autoComplete="bday"
        dica="É preciso ter 18 anos ou mais."
      />
      <CampoTexto
        className="sm:col-span-2"
        nome="pf.celular"
        rotulo="Celular com DDD"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="(11) 91234-5678"
        mascara={formatarTelefone}
      />
    </div>
  );
}

type StatusCnpj = { tipo: "buscando" } | { tipo: "sucesso" } | { tipo: "erro"; mensagem: string };

function IdentificacaoPJ() {
  const { getValues, setValue } = useFormContext<ValoresFormularioCadastro>();
  const contribuinte = useWatch<ValoresFormularioCadastro, "fiscal.contribuinteIcms">({ name: "fiscal.contribuinteIcms" });
  const ieIsento = useWatch<ValoresFormularioCadastro, "pj.ieIsento">({ name: "pj.ieIsento" });
  const regraIe = regraInscricaoEstadual(contribuinte);
  const isentoTravado = regraIe.checkboxIsento !== "livre";
  const [statusCnpj, setStatusCnpj] = useState<StatusCnpj | null>(null);

  // Preenchimento automático é só um atalho: nunca sobrescreve o que o
  // usuário já digitou, e se a BrasilAPI falhar ele segue digitando.
  async function buscarCnpj(cnpj: string) {
    if (!validarCNPJ(cnpj)) return;

    setStatusCnpj({ tipo: "buscando" });
    const resultado = await buscarDadosPorCnpj(cnpj);
    if (!resultado.sucesso) {
      setStatusCnpj({ tipo: "erro", mensagem: resultado.mensagem });
      return;
    }

    const { dados } = resultado;
    if (dados.razaoSocial && !getValues("pj.razaoSocial")) {
      setValue("pj.razaoSocial", dados.razaoSocial.slice(0, 60), { shouldDirty: true });
    }
    if (dados.cep && !getValues("endereco.cep")) {
      setValue("endereco.cep", formatarCEP(dados.cep), { shouldDirty: true });
      setValue("endereco.logradouro", dados.logradouro, { shouldDirty: true });
      setValue("endereco.numero", dados.numero, { shouldDirty: true });
      setValue("endereco.bairro", dados.bairro, { shouldDirty: true });
      setValue("endereco.cidade", dados.cidade, { shouldDirty: true });
      if (ehUf(dados.uf)) setValue("endereco.uf", dados.uf, { shouldDirty: true });
    }
    setStatusCnpj({ tipo: "sucesso" });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CampoTexto
        className="sm:col-span-2"
        nome="pj.cnpj"
        rotulo="CNPJ"
        inputMode="numeric"
        autoComplete="off"
        placeholder="00.000.000/0000-00"
        mascara={formatarCNPJ}
        onBlur={(evento) => void buscarCnpj(evento.target.value)}
        dica={
          statusCnpj && (
            <span role="status">
              {statusCnpj.tipo === "buscando" && "Buscando dados do CNPJ…"}
              {statusCnpj.tipo === "sucesso" && "Dados preenchidos automaticamente. Confira e edite se precisar."}
              {statusCnpj.tipo === "erro" && statusCnpj.mensagem}
            </span>
          )
        }
      />
      <CampoTexto className="sm:col-span-2" nome="pj.razaoSocial" rotulo="Razão social" autoComplete="organization" />
      <CampoTexto className="sm:col-span-2" nome="pj.nomeFantasia" rotulo="Nome fantasia" opcional />

      <div className="sm:col-span-2">
        <CampoTexto
          nome="pj.inscricaoEstadual"
          rotulo="Inscrição estadual"
          inputMode="numeric"
          autoComplete="off"
          opcional={!regraIe.obrigatoria}
          readOnly={ieIsento}
          dica={regraIe.obrigatoria ? "Obrigatória: a empresa foi marcada como contribuinte de ICMS." : undefined}
        />
        <CampoCaixa
          nome="pj.ieIsento"
          rotulo="Isento de inscrição estadual"
          travado={isentoTravado}
          dica={isentoTravado ? "Definido pela resposta “Contribuinte de ICMS”, na etapa de dados fiscais." : undefined}
          aoMudar={(marcado) => {
            if (marcado) setValue("pj.inscricaoEstadual", "", { shouldValidate: true });
          }}
        />
      </div>

      <CampoTexto
        nome="pj.telefoneComercial"
        rotulo="Telefone comercial"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="(11) 3456-7890"
        mascara={formatarTelefone}
      />
      <CampoTexto
        nome="pj.responsavelNome"
        rotulo="Responsável pela conta"
        autoComplete="name"
        dica="Nome e sobrenome de quem vai usar a conta."
      />
    </div>
  );
}
