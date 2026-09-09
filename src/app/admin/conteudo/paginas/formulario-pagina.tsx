"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { EstadoFormularioPagina } from "./actions";
import type { PaginaInstitucional } from "@/types/database";

interface FormularioPaginaProps {
  pagina?: PaginaInstitucional;
  action: (estadoAnterior: EstadoFormularioPagina, formData: FormData) => Promise<EstadoFormularioPagina>;
  textoBotao: string;
}

const estadoInicial: EstadoFormularioPagina = {};

export function FormularioPagina({ pagina, action, textoBotao }: FormularioPaginaProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="titulo" className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
          Título *
        </label>
        <Input id="titulo" name="titulo" defaultValue={pagina?.titulo} required />
        {pagina && (
          <p className="mt-1 text-xs text-[var(--admin-text-secondary)]">
            URL atual: /institucional/{pagina.slug} — muda automaticamente se o título mudar.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="corpo" className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
          Corpo *
        </label>
        <Textarea id="corpo" name="corpo" rows={14} defaultValue={pagina?.corpo} required />
        <p className="mt-1 text-xs text-[var(--admin-text-secondary)]">
          Texto simples — separe parágrafos com uma linha em branco. Sem formatação (negrito, listas, links).
        </p>
      </div>

      <div className="rounded-md border border-[var(--admin-border)] p-3">
        <p className="text-sm font-medium text-[var(--admin-text)]">SEO (opcional)</p>
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="seo_titulo" className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
              Título para buscadores
            </label>
            <Input id="seo_titulo" name="seo_titulo" defaultValue={pagina?.seo_titulo ?? ""} placeholder={pagina?.titulo} />
          </div>
          <div>
            <label htmlFor="seo_descricao" className="mb-1 block text-sm font-medium text-[var(--admin-text)]">
              Descrição para buscadores
            </label>
            <Textarea id="seo_descricao" name="seo_descricao" rows={2} defaultValue={pagina?.seo_descricao ?? ""} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="ativo"
          name="ativo"
          type="checkbox"
          defaultChecked={pagina ? pagina.ativo : true}
          className="h-4 w-4 rounded border-[var(--admin-border-strong)]"
        />
        <label htmlFor="ativo" className="text-sm font-medium text-[var(--admin-text)]">
          Página ativa (visível no site e linkável no footer)
        </label>
      </div>

      {estado.erro && <p className="text-sm text-[var(--admin-danger)]">{estado.erro}</p>}

      <Button type="submit" variant="primary" disabled={pendente}>
        {pendente ? "Salvando..." : textoBotao}
      </Button>
    </form>
  );
}
