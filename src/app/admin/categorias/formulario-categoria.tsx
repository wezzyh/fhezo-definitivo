"use client";

import { useActionState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { UploadImagem } from "@/components/admin/upload-imagem";
import { useFecharModalDeRota } from "@/components/admin/modal-de-rota";
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
  const fecharModal = useFecharModalDeRota();

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
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
          Nome *
        </label>
        <Input id="nome" name="nome" defaultValue={categoria?.nome} required />
      </div>

      <UploadImagem
        name="imagem_url"
        valorInicial={categoria?.imagem_url ?? null}
        pasta="categorias"
        label="Imagem"
      />

      <div>
        <label htmlFor="categoria_pai_id" className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
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
        <p className="mt-1 text-xs text-[var(--admin-text-secondary)]">
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
          className="h-4 w-4 rounded border-[var(--admin-border-strong)]"
        />
        <label htmlFor="ativo" className="text-sm font-medium text-[var(--admin-text)]">
          Categoria ativa (disponível para seleção em produtos)
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
