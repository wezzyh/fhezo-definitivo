"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useCheckout } from "@/lib/checkout/contexto";
import { formatarCEP } from "@/lib/checkout/formatar";
import { buscarEnderecoPorCep } from "@/lib/checkout/viacep";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

type StatusCep = { tipo: "buscando" } | { tipo: "sucesso" } | { tipo: "erro"; mensagem: string };

export function SecaoEndereco() {
  const { endereco, atualizarEndereco } = useCheckout();
  const [statusCep, setStatusCep] = useState<StatusCep | null>(null);

  async function lidarComBlurCep() {
    const numeros = endereco.cep.replace(/\D/g, "");
    if (numeros.length !== 8) return;

    setStatusCep({ tipo: "buscando" });
    const resultado = await buscarEnderecoPorCep(numeros);

    if (!resultado.sucesso) {
      setStatusCep({ tipo: "erro", mensagem: resultado.mensagem });
      return;
    }

    atualizarEndereco({
      rua: resultado.endereco.logradouro,
      bairro: resultado.endereco.bairro,
      cidade: resultado.endereco.localidade,
      uf: resultado.endereco.uf,
    });
    setStatusCep({ tipo: "sucesso" });
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-ink">Endereço de entrega</h2>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cep" className="mb-1 block text-sm font-medium text-ink">
            CEP *
          </label>
          <Input
            id="cep"
            value={endereco.cep}
            onChange={(evento) => atualizarEndereco({ cep: formatarCEP(evento.target.value) })}
            onBlur={lidarComBlurCep}
            inputMode="numeric"
            required
          />
          {statusCep?.tipo === "buscando" && (
            <p className="mt-1 text-xs text-muted">Buscando endereço...</p>
          )}
          {statusCep?.tipo === "erro" && (
            <p className="mt-1 text-xs text-muted">{statusCep.mensagem}</p>
          )}
        </div>
        <div>
          <label htmlFor="numero" className="mb-1 block text-sm font-medium text-ink">
            Número *
          </label>
          <Input
            id="numero"
            value={endereco.numero}
            onChange={(evento) => atualizarEndereco({ numero: evento.target.value })}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="rua" className="mb-1 block text-sm font-medium text-ink">
            Rua *
          </label>
          <Input
            id="rua"
            value={endereco.rua}
            onChange={(evento) => atualizarEndereco({ rua: evento.target.value })}
            required
          />
        </div>
        <div>
          <label htmlFor="complemento" className="mb-1 block text-sm font-medium text-ink">
            Complemento
          </label>
          <Input
            id="complemento"
            value={endereco.complemento}
            onChange={(evento) => atualizarEndereco({ complemento: evento.target.value })}
          />
        </div>
        <div>
          <label htmlFor="bairro" className="mb-1 block text-sm font-medium text-ink">
            Bairro *
          </label>
          <Input
            id="bairro"
            value={endereco.bairro}
            onChange={(evento) => atualizarEndereco({ bairro: evento.target.value })}
            required
          />
        </div>
        <div>
          <label htmlFor="cidade" className="mb-1 block text-sm font-medium text-ink">
            Cidade *
          </label>
          <Input
            id="cidade"
            value={endereco.cidade}
            onChange={(evento) => atualizarEndereco({ cidade: evento.target.value })}
            required
          />
        </div>
        <div>
          <label htmlFor="uf" className="mb-1 block text-sm font-medium text-ink">
            UF *
          </label>
          <select
            id="uf"
            value={endereco.uf}
            onChange={(evento) => atualizarEndereco({ uf: evento.target.value })}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-ink outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
          >
            <option value="">Selecione</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
