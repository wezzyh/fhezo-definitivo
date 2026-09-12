"use client";

import { useRef, useState } from "react";
import { get, useFormContext, useWatch } from "react-hook-form";
import { formatarCEP } from "@/lib/checkout/formatar";
import { buscarEnderecoPorCep } from "@/lib/checkout/viacep";
import type { ValoresFormularioCadastro } from "@/lib/clientes/cadastro/esquemas";
import { UFS, ehUf, ufTemSuframa } from "@/lib/clientes/cadastro/regras-fiscais";
import { apenasDigitos } from "@/lib/clientes/cadastro/validadores";
import { CampoCaixa, CampoSelecao, CampoTexto } from "./campos";

interface EtapaEnderecoProps {
  /** Leva o usuário à etapa de identificação, no campo da inscrição estadual. */
  aoCorrigirIe: () => void;
}

export function EtapaEndereco({ aoCorrigirIe }: EtapaEnderecoProps) {
  const {
    formState: { errors },
  } = useFormContext<ValoresFormularioCadastro>();
  const tipo = useWatch<ValoresFormularioCadastro, "tipo">({ name: "tipo" });
  const uf = useWatch<ValoresFormularioCadastro, "endereco.uf">({ name: "endereco.uf" });
  const entregaDiferente = useWatch<ValoresFormularioCadastro, "entregaDiferente">({ name: "entregaDiferente" });

  // A regra da IE por UF só pode rodar aqui (é a primeira etapa com UF),
  // mas o campo é da etapa de identificação — o erro aparece como aviso
  // com atalho para corrigir lá.
  const erroIe =
    tipo === "PJ" ? (get(errors, "pj.inscricaoEstadual") as { message?: string } | undefined)?.message : undefined;

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-base font-semibold text-ink">Endereço de cobrança</legend>
        <p className="mt-1 text-xs text-muted">Também usado para entrega, a menos que você informe outro abaixo.</p>
        <BlocoEndereco prefixo="endereco" />
      </fieldset>

      {tipo === "PJ" && ufTemSuframa(uf) && (
        <CampoTexto
          nome="fiscal.inscricaoSuframa"
          rotulo="Inscrição SUFRAMA"
          opcional
          inputMode="numeric"
          autoComplete="off"
          dica={`Para empresas em ${uf} com benefício fiscal da SUFRAMA.`}
        />
      )}

      {erroIe && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{erroIe}</p>
          <button
            type="button"
            data-erro-foco
            onClick={aoCorrigirIe}
            className="mt-1 min-h-11 font-medium underline underline-offset-2"
          >
            Corrigir a inscrição estadual
          </button>
        </div>
      )}

      <CampoCaixa nome="entregaDiferente" rotulo="Endereço de entrega é diferente do endereço de cobrança" />

      {entregaDiferente && (
        <fieldset>
          <legend className="text-base font-semibold text-ink">Endereço de entrega</legend>
          <BlocoEndereco prefixo="entrega" />
        </fieldset>
      )}
    </div>
  );
}

type StatusCep = { tipo: "buscando" } | { tipo: "sucesso" } | { tipo: "erro"; mensagem: string };

/**
 * CEP primeiro, com busca automática no ViaCEP ao completar 8 dígitos.
 * Os campos NUNCA ficam travados: se o CEP não for encontrado ou a API
 * cair, o usuário simplesmente digita o endereço.
 */
function BlocoEndereco({ prefixo }: { prefixo: "endereco" | "entrega" }) {
  const { setValue } = useFormContext<ValoresFormularioCadastro>();
  const semNumero = useWatch<ValoresFormularioCadastro, `${typeof prefixo}.semNumero`>({ name: `${prefixo}.semNumero` });
  const [statusCep, setStatusCep] = useState<StatusCep | null>(null);
  const ultimoCepBuscado = useRef("");
  // "billing"/"shipping" fazem o preenchimento automático do navegador
  // usar o endereço certo em cada bloco.
  const secao = prefixo === "entrega" ? "shipping" : "billing";

  async function buscarCep(valor: string) {
    const numeros = apenasDigitos(valor);
    if (numeros.length !== 8 || numeros === ultimoCepBuscado.current) return;
    ultimoCepBuscado.current = numeros;

    setStatusCep({ tipo: "buscando" });
    const resultado = await buscarEnderecoPorCep(numeros);
    if (!resultado.sucesso) {
      setStatusCep({ tipo: "erro", mensagem: resultado.mensagem });
      return;
    }

    const opcoes = { shouldDirty: true, shouldValidate: true };
    const { endereco } = resultado;
    if (endereco.logradouro) setValue(`${prefixo}.logradouro`, endereco.logradouro, opcoes);
    if (endereco.bairro) setValue(`${prefixo}.bairro`, endereco.bairro, opcoes);
    if (endereco.localidade) setValue(`${prefixo}.cidade`, endereco.localidade, opcoes);
    if (ehUf(endereco.uf)) setValue(`${prefixo}.uf`, endereco.uf, opcoes);
    setStatusCep({ tipo: "sucesso" });
  }

  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-6">
      <CampoTexto
        className="sm:col-span-3"
        nome={`${prefixo}.cep`}
        rotulo="CEP"
        inputMode="numeric"
        autoComplete={`${secao} postal-code`}
        placeholder="00000-000"
        mascara={formatarCEP}
        onChange={(evento) => void buscarCep(evento.target.value)}
        onBlur={(evento) => void buscarCep(evento.target.value)}
        dica={
          statusCep && (
            <span role="status">
              {statusCep.tipo === "buscando" && "Buscando endereço…"}
              {statusCep.tipo === "sucesso" && "Endereço encontrado. Confira e complete."}
              {statusCep.tipo === "erro" && statusCep.mensagem}
            </span>
          )
        }
      />
      <CampoTexto
        className="sm:col-span-6"
        nome={`${prefixo}.logradouro`}
        rotulo="Rua / logradouro"
        autoComplete={`${secao} address-line1`}
      />
      <div className="sm:col-span-3">
        <CampoTexto nome={`${prefixo}.numero`} rotulo="Número" readOnly={semNumero} autoComplete="off" />
        <CampoCaixa
          nome={`${prefixo}.semNumero`}
          rotulo="Sem número"
          aoMudar={(marcado) => {
            if (marcado) setValue(`${prefixo}.numero`, "", { shouldValidate: true });
          }}
        />
      </div>
      <CampoTexto
        className="sm:col-span-3"
        nome={`${prefixo}.complemento`}
        rotulo="Complemento"
        opcional
        autoComplete={`${secao} address-line2`}
      />
      <CampoTexto className="sm:col-span-6" nome={`${prefixo}.bairro`} rotulo="Bairro" autoComplete="off" />
      <CampoTexto
        className="sm:col-span-4"
        nome={`${prefixo}.cidade`}
        rotulo="Cidade"
        autoComplete={`${secao} address-level2`}
      />
      <CampoSelecao
        className="sm:col-span-2"
        nome={`${prefixo}.uf`}
        rotulo="UF"
        autoComplete={`${secao} address-level1`}
      >
        <option value="">Selecione</option>
        {UFS.map((sigla) => (
          <option key={sigla} value={sigla}>
            {sigla}
          </option>
        ))}
      </CampoSelecao>
      <CampoTexto
        className="sm:col-span-6"
        nome={`${prefixo}.referencia`}
        rotulo="Ponto de referência"
        opcional
        autoComplete="off"
      />
    </div>
  );
}
