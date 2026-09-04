"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SEGMENTOS_CLIENTE } from "@/lib/clientes/segmentos";
import type { EstadoFormularioCrm } from "./actions";
import type { ClienteCrm } from "@/types/database";

interface FormularioCrmProps {
  crm: ClienteCrm | null;
  action: (estadoAnterior: EstadoFormularioCrm, formData: FormData) => Promise<EstadoFormularioCrm>;
}

const estadoInicial: EstadoFormularioCrm = {};

export function FormularioCrm({ crm, action }: FormularioCrmProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  // Segmento salvo pode não estar (mais) na lista pré-definida — mantém
  // como opção extra pra não "sumir" o valor no select.
  const segmentoAtual = crm?.segmento ?? "";
  const opcoesSegmento =
    segmentoAtual && !(SEGMENTOS_CLIENTE as readonly string[]).includes(segmentoAtual)
      ? [segmentoAtual, ...SEGMENTOS_CLIENTE]
      : SEGMENTOS_CLIENTE;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="nome_comprador" className="mb-1 block text-sm font-medium text-ink">
          Comprador (contato principal)
        </label>
        <Input id="nome_comprador" name="nome_comprador" defaultValue={crm?.nome_comprador ?? ""} />
      </div>

      <div>
        <label htmlFor="segmento" className="mb-1 block text-sm font-medium text-ink">
          Segmento
        </label>
        <Select id="segmento" name="segmento" defaultValue={segmentoAtual}>
          <option value="">Não definido</option>
          {opcoesSegmento.map((segmento) => (
            <option key={segmento} value={segmento}>
              {segmento}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="valor_potencial" className="mb-1 block text-sm font-medium text-ink">
          Valor potencial (R$)
        </label>
        <Input
          id="valor_potencial"
          name="valor_potencial"
          type="number"
          min={0}
          step="0.01"
          defaultValue={crm?.valor_potencial ?? ""}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="proxima_acao" className="mb-1 block text-sm font-medium text-ink">
            Próxima ação
          </label>
          <Input
            id="proxima_acao"
            name="proxima_acao"
            placeholder="Ex.: Ligar para renovar cotação"
            defaultValue={crm?.proxima_acao ?? ""}
          />
        </div>
        <div>
          <label htmlFor="proxima_acao_data" className="mb-1 block text-sm font-medium text-ink">
            Data da próxima ação
          </label>
          <Input
            id="proxima_acao_data"
            name="proxima_acao_data"
            type="date"
            defaultValue={crm?.proxima_acao_data ?? ""}
          />
        </div>
      </div>

      <div>
        <label htmlFor="observacoes" className="mb-1 block text-sm font-medium text-ink">
          Observações
        </label>
        <Textarea id="observacoes" name="observacoes" rows={4} defaultValue={crm?.observacoes ?? ""} />
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      {estado.sucesso && <p className="text-sm text-brand-green-dark">Dados salvos com sucesso.</p>}

      <Button type="submit" variant="primary" disabled={pendente}>
        {pendente ? "Salvando..." : "Salvar dados de CRM"}
      </Button>
    </form>
  );
}
