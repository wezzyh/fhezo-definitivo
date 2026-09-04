"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFecharModalDeRota } from "@/components/admin/modal-de-rota";
import type { EstadoFormularioMarca } from "./actions";
import type { Marca } from "@/types/database";

interface FormularioMarcaProps {
  marca?: Marca;
  action: (
    estadoAnterior: EstadoFormularioMarca,
    formData: FormData,
  ) => Promise<EstadoFormularioMarca>;
  textoBotao: string;
}

const estadoInicial: EstadoFormularioMarca = {};

export function FormularioMarca({ marca, action, textoBotao }: FormularioMarcaProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const fecharModal = useFecharModalDeRota();

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
          Nome *
        </label>
        <Input id="nome" name="nome" defaultValue={marca?.nome} required />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="ativo"
          name="ativo"
          type="checkbox"
          defaultChecked={marca ? marca.ativo : true}
          className="h-4 w-4 rounded border-[var(--admin-border-strong)]"
        />
        <label htmlFor="ativo" className="text-sm font-medium text-[var(--admin-text)]">
          Marca ativa (disponível para seleção em produtos)
        </label>
      </div>

      {estado.erro && <p className="text-sm text-[var(--admin-danger)]">{estado.erro}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={pendente}>
          {pendente ? "Salvando..." : textoBotao}
        </Button>
        {fecharModal && (
          <Button type="button" variant="ghost" onClick={fecharModal} disabled={pendente}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
