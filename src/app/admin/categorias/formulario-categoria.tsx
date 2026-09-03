"use client";

import { useActionState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ordenarCategoriasComHierarquia, rotuloComIndentacao, descendentesDe } from "@/lib/categorias/hierarquia";
import type { EstadoFormularioCategoria } from "./actions";
import type { Categoria } from "@/types/database";

interface FormularioCategoriaProps {
  categoria?: Categoria;
  categorias: Categoria[];
  action: (
    estadoAnterior: EstadoFormularioCategoria,
    formData: FormData,
  ) => Promise<EstadoFormularioCategoria>;
  textoBotao: string;
}

const estadoInicial: EstadoFormularioCategoria = {};

export function FormularioCategoria({ categoria, categorias, action, textoBotao }: FormularioCategoriaProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  // Ao editar, uma categoria não pode virar mãe dela mesma nem de uma das
  // suas próprias subcategorias (formaria um ciclo) — essas opções somem
  // do seletor em vez de deixar escolher e só barrar no servidor depois.
  const opcoesPai = useMemo(() => {
    const excluidos = categoria ? descendentesDe(categoria.id, categorias) : new Set<string>();
    return ordenarCategoriasComHierarquia(categorias).filter((c) => !excluidos.has(c.id));
  }, [categorias, categoria]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-ink">
          Nome *
        </label>
        <Input id="nome" name="nome" defaultValue={categoria?.nome} required />
      </div>

      <div>
        <label htmlFor="categoria_pai_id" className="mb-1 block text-sm font-medium text-ink">
          Categoria-mãe
        </label>
        <Select
          id="categoria_pai_id"
          name="categoria_pai_id"
          defaultValue={categoria?.categoria_pai_id ?? ""}
        >
          <option value="">Nenhuma (categoria de topo)</option>
          {opcoesPai.map((opcao) => (
            <option key={opcao.id} value={opcao.id}>
              {rotuloComIndentacao(opcao)}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-muted">
          Ex.: para criar &quot;Rolamentos Rígidos&quot; dentro de &quot;Rolamentos&quot;, escolha
          &quot;Rolamentos&quot; aqui.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="ativo"
          name="ativo"
          type="checkbox"
          defaultChecked={categoria ? categoria.ativo : true}
          className="h-4 w-4 rounded border-zinc-300"
        />
        <label htmlFor="ativo" className="text-sm font-medium text-ink">
          Categoria ativa (disponível para seleção em produtos)
        </label>
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <Button type="submit" variant="primary" disabled={pendente}>
        {pendente ? "Salvando..." : textoBotao}
      </Button>
    </form>
  );
}
