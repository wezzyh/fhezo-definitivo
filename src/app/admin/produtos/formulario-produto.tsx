"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { criarMarcaRapida } from "../marcas/actions";
import { criarCategoriaRapida } from "../categorias/actions";
import { ordenarCategoriasComHierarquia, rotuloComIndentacao } from "@/lib/categorias/hierarquia";
import type { EstadoFormularioProduto } from "./actions";
import type { Produto, Marca, Categoria } from "@/types/database";

interface ParAtributo {
  chave: string;
  valor: string;
}

interface FormularioProdutoProps {
  produto?: Produto;
  marcasIniciais: Marca[];
  categoriasIniciais: Categoria[];
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

export function FormularioProduto({
  produto,
  marcasIniciais,
  categoriasIniciais,
  action,
  textoBotao,
}: FormularioProdutoProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  const listaInicial = atributosParaLista(produto?.atributos);
  const [atributos, setAtributos] = useState<ParAtributo[]>(
    listaInicial.length > 0 ? listaInicial : [{ chave: "", valor: "" }],
  );

  const [marcas, setMarcas] = useState<Marca[]>(marcasIniciais);
  const [categorias, setCategorias] = useState<Categoria[]>(categoriasIniciais);
  const [marcaSelecionada, setMarcaSelecionada] = useState(produto?.marca_id ?? "");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(produto?.categoria_id ?? "");

  const [mostrandoNovaMarca, setMostrandoNovaMarca] = useState(false);
  const [nomeNovaMarca, setNomeNovaMarca] = useState("");
  const [criandoMarca, setCriandoMarca] = useState(false);
  const [erroNovaMarca, setErroNovaMarca] = useState<string | null>(null);

  const [mostrandoNovaCategoria, setMostrandoNovaCategoria] = useState(false);
  const [nomeNovaCategoria, setNomeNovaCategoria] = useState("");
  const [criandoCategoria, setCriandoCategoria] = useState(false);
  const [erroNovaCategoria, setErroNovaCategoria] = useState<string | null>(null);

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

  async function lidarComCriarMarca() {
    setErroNovaMarca(null);
    setCriandoMarca(true);
    const resultado = await criarMarcaRapida(nomeNovaMarca);
    setCriandoMarca(false);

    if (!resultado.sucesso) {
      setErroNovaMarca(resultado.erro);
      return;
    }

    setMarcas((atual) => [...atual, { id: resultado.id, nome: resultado.nome, ativo: true, created_at: "" }]);
    setMarcaSelecionada(resultado.id);
    setNomeNovaMarca("");
    setMostrandoNovaMarca(false);
  }

  async function lidarComCriarCategoria() {
    setErroNovaCategoria(null);
    setCriandoCategoria(true);
    const resultado = await criarCategoriaRapida(nomeNovaCategoria);
    setCriandoCategoria(false);

    if (!resultado.sucesso) {
      setErroNovaCategoria(resultado.erro);
      return;
    }

    setCategorias((atual) => [
      ...atual,
      {
        id: resultado.id,
        nome: resultado.nome,
        slug: "",
        categoria_pai_id: null,
        ativo: true,
        created_at: "",
      },
    ]);
    setCategoriaSelecionada(resultado.id);
    setNomeNovaCategoria("");
    setMostrandoNovaCategoria(false);
  }

  const categoriasOrdenadas = ordenarCategoriasComHierarquia(categorias);
  const marcasOrdenadas = [...marcas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

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
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="marca_id" className="block text-sm font-medium text-ink">
              Marca *
            </label>
            <button
              type="button"
              className="text-xs font-medium text-brand-green hover:underline"
              onClick={() => setMostrandoNovaMarca((atual) => !atual)}
            >
              {mostrandoNovaMarca ? "Cancelar" : "+ nova marca"}
            </button>
          </div>
          <Select
            id="marca_id"
            name="marca_id"
            value={marcaSelecionada}
            onChange={(evento) => setMarcaSelecionada(evento.target.value)}
            required
          >
            <option value="" disabled>
              Selecione uma marca
            </option>
            {marcasOrdenadas.map((marca) => (
              <option key={marca.id} value={marca.id}>
                {marca.nome}
                {!marca.ativo && " (inativa)"}
              </option>
            ))}
          </Select>

          {mostrandoNovaMarca && (
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Nome da nova marca"
                value={nomeNovaMarca}
                onChange={(evento) => setNomeNovaMarca(evento.target.value)}
                className="flex-1"
              />
              <Button type="button" variant="outline" disabled={criandoMarca} onClick={lidarComCriarMarca}>
                {criandoMarca ? "Criando..." : "Criar"}
              </Button>
            </div>
          )}
          {erroNovaMarca && <p className="mt-1 text-xs text-red-600">{erroNovaMarca}</p>}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="categoria_id" className="block text-sm font-medium text-ink">
              Categoria *
            </label>
            <button
              type="button"
              className="text-xs font-medium text-brand-green hover:underline"
              onClick={() => setMostrandoNovaCategoria((atual) => !atual)}
            >
              {mostrandoNovaCategoria ? "Cancelar" : "+ nova categoria"}
            </button>
          </div>
          <Select
            id="categoria_id"
            name="categoria_id"
            value={categoriaSelecionada}
            onChange={(evento) => setCategoriaSelecionada(evento.target.value)}
            required
          >
            <option value="" disabled>
              Selecione uma categoria
            </option>
            {categoriasOrdenadas.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {rotuloComIndentacao(categoria)}
                {!categoria.ativo && " (inativa)"}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted">
            Para escolher uma categoria-mãe (hierarquia), use{" "}
            <a href="/admin/categorias" className="underline">
              Categorias
            </a>
            . Aqui só cria de topo.
          </p>

          {mostrandoNovaCategoria && (
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Nome da nova categoria"
                value={nomeNovaCategoria}
                onChange={(evento) => setNomeNovaCategoria(evento.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                disabled={criandoCategoria}
                onClick={lidarComCriarCategoria}
              >
                {criandoCategoria ? "Criando..." : "Criar"}
              </Button>
            </div>
          )}
          {erroNovaCategoria && <p className="mt-1 text-xs text-red-600">{erroNovaCategoria}</p>}
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
        <p className="text-sm font-medium text-ink">Identificação fiscal (opcional)</p>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ean" className="mb-1 block text-xs font-medium text-muted">
              EAN (código de barras)
            </label>
            <Input id="ean" name="ean" defaultValue={produto?.ean ?? ""} />
          </div>
          <div>
            <label htmlFor="ncm" className="mb-1 block text-xs font-medium text-muted">
              NCM
            </label>
            <Input id="ncm" name="ncm" defaultValue={produto?.ncm ?? ""} />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="imagem_url" className="mb-1 block text-sm font-medium text-ink">
          Imagem principal (URL)
        </label>
        <Input
          id="imagem_url"
          name="imagem_url"
          type="url"
          placeholder="https://..."
          defaultValue={produto?.imagem_url ?? ""}
        />
        <p className="mt-1 text-xs text-muted">
          Ainda não há upload de arquivo — cole a URL de uma imagem já hospedada.
        </p>
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
        <p className="text-sm font-medium text-ink">SEO (opcional)</p>
        <div className="mt-2 space-y-3">
          <div>
            <label htmlFor="seo_titulo" className="mb-1 block text-xs font-medium text-muted">
              Título SEO
            </label>
            <Input
              id="seo_titulo"
              name="seo_titulo"
              defaultValue={produto?.seo_titulo ?? ""}
              placeholder="Usa o nome do produto quando vazio"
            />
          </div>
          <div>
            <label htmlFor="seo_descricao" className="mb-1 block text-xs font-medium text-muted">
              Meta descrição SEO
            </label>
            <textarea
              id="seo_descricao"
              name="seo_descricao"
              defaultValue={produto?.seo_descricao ?? ""}
              rows={2}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-ink outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
            />
          </div>
        </div>
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
