"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-ink">
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
          className="h-4 w-4 rounded border-zinc-300"
        />
        <label htmlFor="ativo" className="text-sm font-medium text-ink">
          Marca ativa (disponível para seleção em produtos)
        </label>
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <Button type="submit" variant="primary" disabled={pendente}>
        {pendente ? "Salvando..." : textoBotao}
      </Button>
    </form>
  );
}
