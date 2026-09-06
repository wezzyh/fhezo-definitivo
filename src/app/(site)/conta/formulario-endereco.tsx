"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatarCEP } from "@/lib/checkout/formatar";
import { buscarEnderecoPorCep } from "@/lib/checkout/viacep";
import { atualizarEnderecoCliente, type EstadoFormularioConta } from "./actions";
import type { Cliente } from "@/types/database";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const estadoInicial: EstadoFormularioConta = {};

export function FormularioEndereco({ cliente }: { cliente: Cliente }) {
  const [estado, formAction, pendente] = useActionState(atualizarEnderecoCliente, estadoInicial);

  const [cep, setCep] = useState(cliente.endereco_cep ? formatarCEP(cliente.endereco_cep) : "");
  const [rua, setRua] = useState(cliente.endereco_rua ?? "");
  const [bairro, setBairro] = useState(cliente.endereco_bairro ?? "");
  const [cidade, setCidade] = useState(cliente.endereco_cidade ?? "");
  const [uf, setUf] = useState(cliente.endereco_uf ?? "");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState<string | null>(null);

  async function lidarComBlurCep() {
    const numeros = cep.replace(/\D/g, "");
    if (numeros.length !== 8) return;

    setBuscandoCep(true);
    setErroCep(null);
    const resultado = await buscarEnderecoPorCep(numeros);
    setBuscandoCep(false);

    if (!resultado.sucesso) {
      setErroCep(resultado.mensagem);
      return;
    }

    setRua(resultado.endereco.logradouro);
    setBairro(resultado.endereco.bairro);
    setCidade(resultado.endereco.localidade);
    setUf(resultado.endereco.uf);
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cep" className="mb-1 block text-sm font-medium text-ink">
            CEP
          </label>
          <Input
            id="cep"
            name="cep"
            value={cep}
            onChange={(e) => setCep(formatarCEP(e.target.value))}
            onBlur={lidarComBlurCep}
            inputMode="numeric"
          />
          {buscandoCep && <p className="mt-1 text-xs text-muted">Buscando endereço...</p>}
          {erroCep && <p className="mt-1 text-xs text-muted">{erroCep}</p>}
        </div>
        <div>
          <label htmlFor="numero" className="mb-1 block text-sm font-medium text-ink">
            Número
          </label>
          <Input id="numero" name="numero" defaultValue={cliente.endereco_numero ?? ""} />
        </div>
      </div>

      <div>
        <label htmlFor="rua" className="mb-1 block text-sm font-medium text-ink">
          Rua
        </label>
        <Input id="rua" name="rua" value={rua} onChange={(e) => setRua(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="complemento" className="mb-1 block text-sm font-medium text-ink">
            Complemento
          </label>
          <Input id="complemento" name="complemento" defaultValue={cliente.endereco_complemento ?? ""} />
        </div>
        <div>
          <label htmlFor="bairro" className="mb-1 block text-sm font-medium text-ink">
            Bairro
          </label>
          <Input id="bairro" name="bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
        </div>
        <div>
          <label htmlFor="cidade" className="mb-1 block text-sm font-medium text-ink">
            Cidade
          </label>
          <Input id="cidade" name="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
        </div>
        <div>
          <label htmlFor="uf" className="mb-1 block text-sm font-medium text-ink">
            UF
          </label>
          <select
            id="uf"
            name="uf"
            value={uf}
            onChange={(e) => setUf(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-ink outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
          >
            <option value="">Selecione</option>
            {UFS.map((sigla) => (
              <option key={sigla} value={sigla}>
                {sigla}
              </option>
            ))}
          </select>
        </div>
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      {estado.sucesso && <p className="text-sm text-brand-green">Endereço salvo.</p>}

      <Button type="submit" variant="primary" disabled={pendente}>
        {pendente ? "Salvando..." : "Salvar endereço"}
      </Button>
    </form>
  );
}
