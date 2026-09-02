"use client";

import { Input } from "@/components/ui/input";
import { formatarCPF, formatarCEP, formatarTelefone } from "@/lib/checkout/formatar";

export interface DadosCartaoForm {
  numero: string;
  nomeImpresso: string;
  validade: string;
  cvv: string;
}

export interface DadosTitularForm {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cep: string;
}

function formatarNumeroCartao(valor: string): string {
  const numeros = valor.replace(/\D/g, "").slice(0, 19);
  return numeros.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatarValidadeCartao(valor: string): string {
  const numeros = valor.replace(/\D/g, "").slice(0, 4);
  if (numeros.length <= 2) return numeros;
  return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
}

interface FormularioCartaoProps {
  cartao: DadosCartaoForm;
  onAlterarCartao: (dados: Partial<DadosCartaoForm>) => void;
  titular: DadosTitularForm;
  onAlterarTitular: (dados: Partial<DadosTitularForm>) => void;
}

export function FormularioCartao({
  cartao,
  onAlterarCartao,
  titular,
  onAlterarTitular,
}: FormularioCartaoProps) {
  return (
    <div className="mt-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-ink">Dados do cartão</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="numeroCartao" className="mb-1 block text-sm font-medium text-ink">
              Número do cartão *
            </label>
            <Input
              id="numeroCartao"
              value={cartao.numero}
              onChange={(evento) => onAlterarCartao({ numero: formatarNumeroCartao(evento.target.value) })}
              inputMode="numeric"
              placeholder="0000 0000 0000 0000"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="nomeImpresso" className="mb-1 block text-sm font-medium text-ink">
              Nome impresso no cartão *
            </label>
            <Input
              id="nomeImpresso"
              value={cartao.nomeImpresso}
              onChange={(evento) => onAlterarCartao({ nomeImpresso: evento.target.value.toUpperCase() })}
              required
            />
          </div>
          <div>
            <label htmlFor="validadeCartao" className="mb-1 block text-sm font-medium text-ink">
              Validade (MM/AA) *
            </label>
            <Input
              id="validadeCartao"
              value={cartao.validade}
              onChange={(evento) => onAlterarCartao({ validade: formatarValidadeCartao(evento.target.value) })}
              inputMode="numeric"
              placeholder="MM/AA"
              required
            />
          </div>
          <div>
            <label htmlFor="cvv" className="mb-1 block text-sm font-medium text-ink">
              CVV *
            </label>
            <Input
              id="cvv"
              value={cartao.cvv}
              onChange={(evento) =>
                onAlterarCartao({ cvv: evento.target.value.replace(/\D/g, "").slice(0, 4) })
              }
              inputMode="numeric"
              placeholder="000"
              required
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink">Dados do titular</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="nomeTitular" className="mb-1 block text-sm font-medium text-ink">
              Nome completo do titular *
            </label>
            <Input
              id="nomeTitular"
              value={titular.nome}
              onChange={(evento) => onAlterarTitular({ nome: evento.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="cpfTitular" className="mb-1 block text-sm font-medium text-ink">
              CPF do titular *
            </label>
            <Input
              id="cpfTitular"
              value={titular.cpf}
              onChange={(evento) => onAlterarTitular({ cpf: formatarCPF(evento.target.value) })}
              inputMode="numeric"
              required
            />
          </div>
          <div>
            <label htmlFor="telefoneTitular" className="mb-1 block text-sm font-medium text-ink">
              Telefone do titular *
            </label>
            <Input
              id="telefoneTitular"
              value={titular.telefone}
              onChange={(evento) => onAlterarTitular({ telefone: formatarTelefone(evento.target.value) })}
              inputMode="numeric"
              required
            />
          </div>
          <div>
            <label htmlFor="emailTitular" className="mb-1 block text-sm font-medium text-ink">
              Email do titular *
            </label>
            <Input
              id="emailTitular"
              type="email"
              value={titular.email}
              onChange={(evento) => onAlterarTitular({ email: evento.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="cepTitular" className="mb-1 block text-sm font-medium text-ink">
              CEP do titular *
            </label>
            <Input
              id="cepTitular"
              value={titular.cep}
              onChange={(evento) => onAlterarTitular({ cep: formatarCEP(evento.target.value) })}
              inputMode="numeric"
              required
            />
          </div>
        </div>
      </div>
    </div>
  );
}
