"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EstadoFormularioBanner } from "./actions";
import type { Banner } from "@/types/database";
import type { DadosBanner } from "@/lib/conteudo/tipos";

interface FormularioBannerProps {
  banner?: Banner;
  action: (estadoAnterior: EstadoFormularioBanner, formData: FormData) => Promise<EstadoFormularioBanner>;
  textoBotao: string;
}

const estadoInicial: EstadoFormularioBanner = {};

export function FormularioBanner({ banner, action, textoBotao }: FormularioBannerProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const dados = banner?.dados as unknown as DadosBanner | undefined;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="imagem_url" className="mb-1 block text-sm font-medium text-ink">
          URL da imagem *
        </label>
        <Input id="imagem_url" name="imagem_url" defaultValue={dados?.imagem_url} required placeholder="https://..." />
      </div>

      <div>
        <label htmlFor="link_url" className="mb-1 block text-sm font-medium text-ink">
          Link ao clicar (opcional)
        </label>
        <Input id="link_url" name="link_url" defaultValue={dados?.link_url ?? ""} placeholder="/produtos?categoria=rolamentos" />
      </div>

      <div>
        <label htmlFor="titulo" className="mb-1 block text-sm font-medium text-ink">
          Título (opcional, uso interno)
        </label>
        <Input id="titulo" name="titulo" defaultValue={dados?.titulo ?? ""} />
      </div>

      <div>
        <label htmlFor="ordem" className="mb-1 block text-sm font-medium text-ink">
          Ordem
        </label>
        <Input id="ordem" name="ordem" type="number" min={0} defaultValue={dados?.ordem ?? 0} />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="data_inicio" className="mb-1 block text-sm font-medium text-ink">
            Início da vigência (opcional)
          </label>
          <Input id="data_inicio" name="data_inicio" type="date" defaultValue={dados?.data_inicio ?? ""} />
        </div>
        <div className="flex-1">
          <label htmlFor="data_fim" className="mb-1 block text-sm font-medium text-ink">
            Fim da vigência (opcional)
          </label>
          <Input id="data_fim" name="data_fim" type="date" defaultValue={dados?.data_fim ?? ""} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="ativo"
          name="ativo"
          type="checkbox"
          defaultChecked={dados ? dados.ativo : true}
          className="h-4 w-4 rounded border-zinc-300"
        />
        <label htmlFor="ativo" className="text-sm font-medium text-ink">
          Banner ativo (visível no site)
        </label>
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <Button type="submit" variant="primary" disabled={pendente}>
        {pendente ? "Salvando..." : textoBotao}
      </Button>
    </form>
  );
}
