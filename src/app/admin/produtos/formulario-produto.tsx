"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EstadoFormularioProduto } from "./actions";
import type { Produto } from "@/types/database";

interface ParAtributo {
  chave: string;
  valor: string;
}

interface FormularioProdutoProps {
  produto?: Produto;
  action: (
    estadoAnterior: EstadoFormularioProduto,
    formData: FormData,
  ) => Promise<EstadoFormularioProduto>;
  textoBotao: string;
}

function atributosParaLista(
  atributos: Record<string, unknown> | null | undefined,
): ParAtributo[] {
  if (!atributos) return [];
  return Object.entries(atributos).map(([chave, valor]) => ({ chave, valor: String(valor) }));
}

const estadoInicial: EstadoFormularioProduto = {};

export function FormularioProduto({ produto, action, textoBotao }: FormularioProdutoProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  const listaInicial = atributosParaLista(produto?.atributos);
  const [atributos, setAtributos] = useState<ParAtributo[]>(
    listaInicial.length > 0 ? listaInicial : [{ chave: "", valor: "" }],
  );

  function adicionarAtributo() {
    setAtributos((atual) => [...atual, { chave: "", valor: "" }]);
  }

  function removerAtributo(indice: number) {
    setAtributos((atual) => atual.filter((_, i) => i !== indice));
  }

  function atualizarAtributo(indice: number, campo: "chave" | "valor", valor: string) {
    setAtributos((atual) =>
      atual.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)),
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sku" className="mb-1 block text-sm font-medium text-ink">
            SKU *
          </label>
          <Input id="sku" name="sku" defaultValue={produto?.sku} required />
        </div>
        <div>
          <label htmlFor="nome" className="mb-1 block text-sm font-medium text-ink">
            Nome *
          </label>
          <Input id="nome" name="nome" defaultValue={produto?.nome} required />
        </div>
        <div>
          <label htmlFor="categoria" className="mb-1 block text-sm font-medium text-ink">
            Categoria *
          </label>
          <Input id="categoria" name="categoria" defaultValue={produto?.categoria} required />
        </div>
        <div>
          <label htmlFor="preco" className="mb-1 block text-sm font-medium text-ink">
            Preço (R$) *
          </label>
          <Input
            id="preco"
            name="preco"
            type="number"
            step="0.01"
            min="0"
            defaultValue={produto?.preco}
            required
          />
        </div>
        <div>
          <label htmlFor="estoque" className="mb-1 block text-sm font-medium text-ink">
            Estoque *
          </label>
          <Input
            id="estoque"
            name="estoque"
            type="number"
            step="1"
            min="0"
            defaultValue={produto?.estoque}
            required
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            id="ativo"
            name="ativo"
            type="checkbox"
            defaultChecked={produto ? produto.ativo : true}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <label htmlFor="ativo" className="text-sm font-medium text-ink">
            Produto ativo (visível na loja)
          </label>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-ink">Peso e dimensões (usados no cálculo de frete)</p>
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor="peso_kg" className="mb-1 block text-xs font-medium text-muted">
              Peso (kg) *
            </label>
            <Input
              id="peso_kg"
              name="peso_kg"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={produto?.peso_kg}
              required
            />
          </div>
          <div>
            <label htmlFor="altura_cm" className="mb-1 block text-xs font-medium text-muted">
              Altura (cm) *
            </label>
            <Input
              id="altura_cm"
              name="altura_cm"
              type="number"
              step="0.1"
              min="0.1"
              defaultValue={produto?.altura_cm}
              required
            />
          </div>
          <div>
            <label htmlFor="largura_cm" className="mb-1 block text-xs font-medium text-muted">
              Largura (cm) *
            </label>
            <Input
              id="largura_cm"
              name="largura_cm"
              type="number"
              step="0.1"
              min="0.1"
              defaultValue={produto?.largura_cm}
              required
            />
          </div>
          <div>
            <label htmlFor="comprimento_cm" className="mb-1 block text-xs font-medium text-muted">
              Comprimento (cm) *
            </label>
            <Input
              id="comprimento_cm"
              name="comprimento_cm"
              type="number"
              step="0.1"
              min="0.1"
              defaultValue={produto?.comprimento_cm}
              required
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="descricao" className="mb-1 block text-sm font-medium text-ink">
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          defaultValue={produto?.descricao ?? ""}
          rows={4}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-ink outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-ink">Atributos técnicos</label>
          <Button type="button" variant="outline" onClick={adicionarAtributo}>
            + Adicionar atributo
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted">
          Ex.: chave &quot;diametro_interno_mm&quot;, valor &quot;20&quot;.
        </p>

        <div className="mt-3 space-y-2">
          {atributos.map((par, indice) => (
            <div key={indice} className="flex gap-2">
              <Input
                placeholder="chave (ex: diametro_interno_mm)"
                name="atributo_chave"
                className="flex-1"
                value={par.chave}
                onChange={(evento) => atualizarAtributo(indice, "chave", evento.target.value)}
              />
              <Input
                placeholder="valor (ex: 20)"
                name="atributo_valor"
                className="flex-1"
                value={par.valor}
                onChange={(evento) => atualizarAtributo(indice, "valor", evento.target.value)}
              />
              <Button type="button" variant="outline" onClick={() => removerAtributo(indice)}>
                Remover
              </Button>
            </div>
          ))}
        </div>
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <Button type="submit" variant="primary" disabled={pendente}>
        {pendente ? "Salvando..." : textoBotao}
      </Button>
    </form>
  );
}
