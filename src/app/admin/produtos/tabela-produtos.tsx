"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormularioExcluirProduto } from "./botao-excluir";
import { classesBadgeQualidade } from "@/lib/produtos/qualidade";
import { ordenarCategoriasComHierarquia, rotuloComIndentacao } from "@/lib/categorias/hierarquia";
import type { IdProblema } from "@/lib/produtos/filtros";
import {
  alternarAtivoEmMassa,
  atribuirMarcaEmMassa,
  atribuirCategoriaEmMassa,
  ajustarEstoqueEmMassa,
  buscarIdsDoFiltroAtual,
} from "./acoes-em-massa";
import type { Produto, Marca, Categoria } from "@/types/database";

export interface ProdutoDaListagem extends Produto {
  marca: { nome: string } | null;
  categoria: { nome: string } | null;
  qualidade: number;
}

interface TabelaProdutosProps {
  produtos: ProdutoDaListagem[];
  marcas: Marca[];
  categorias: Categoria[];
  totalFiltrado: number;
  somenteRevisao: boolean;
  problemasAtivos: IdProblema[];
}

type MensagemFeedback = { tipo: "sucesso" | "erro"; texto: string } | null;

export function TabelaProdutos({
  produtos,
  marcas,
  categorias,
  totalFiltrado,
  somenteRevisao,
  problemasAtivos,
}: TabelaProdutosProps) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [carregandoSelecaoTotal, setCarregandoSelecaoTotal] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState<MensagemFeedback>(null);

  const [marcaEscolhida, setMarcaEscolhida] = useState("");
  const [categoriaEscolhida, setCategoriaEscolhida] = useState("");
  const [modoEstoque, setModoEstoque] = useState<"definir" | "somar">("definir");
  const [valorEstoque, setValorEstoque] = useState("");

  const categoriasOrdenadas = useMemo(() => ordenarCategoriasComHierarquia(categorias), [categorias]);
  const marcasOrdenadas = useMemo(
    () => [...marcas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [marcas],
  );

  const idsPagina = produtos.map((p) => p.id);
  const todosDaPaginaSelecionados = idsPagina.length > 0 && idsPagina.every((id) => selecionados.has(id));

  function alternarSelecaoPagina() {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (todosDaPaginaSelecionados) {
        idsPagina.forEach((id) => novo.delete(id));
      } else {
        idsPagina.forEach((id) => novo.add(id));
      }
      return novo;
    });
  }

  function alternarSelecaoLinha(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function selecionarTodosOsResultados() {
    setCarregandoSelecaoTotal(true);
    setMensagem(null);
    const resultado = await buscarIdsDoFiltroAtual(somenteRevisao, problemasAtivos);
    setCarregandoSelecaoTotal(false);
    setSelecionados(new Set(resultado.ids));
    if (resultado.truncado) {
      setMensagem({
        tipo: "erro",
        texto: `Apenas os primeiros ${resultado.ids.length} produtos foram selecionados (limite por ação em massa).`,
      });
    }
  }

  function limparSelecao() {
    setSelecionados(new Set());
    setMensagem(null);
  }

  async function executar<T extends { sucesso: boolean; mensagem?: string; afetados: number }>(
    confirmacao: string,
    acao: () => Promise<T>,
    montarSucesso: (resultado: T) => string,
  ) {
    if (!window.confirm(confirmacao)) return;
    setProcessando(true);
    setMensagem(null);
    const resultado = await acao();
    setProcessando(false);

    if (!resultado.sucesso) {
      setMensagem({ tipo: "erro", texto: resultado.mensagem ?? "Não foi possível concluir a ação." });
      return;
    }
    setMensagem({ tipo: "sucesso", texto: montarSucesso(resultado) });
    setSelecionados(new Set());
  }

  function lidarComAtivar(ativo: boolean) {
    const acaoTexto = ativo ? "ativar" : "desativar";
    executar(
      `Tem certeza que deseja ${acaoTexto} ${selecionados.size} produto(s)?`,
      () => alternarAtivoEmMassa([...selecionados], ativo),
      (r) => `${r.afetados} produto(s) ${ativo ? "ativado(s)" : "desativado(s)"}.`,
    );
  }

  function lidarComAtribuirMarca() {
    if (!marcaEscolhida) {
      setMensagem({ tipo: "erro", texto: "Selecione uma marca antes de aplicar." });
      return;
    }
    const nomeMarca = marcasOrdenadas.find((m) => m.id === marcaEscolhida)?.nome ?? "";
    executar(
      `Tem certeza que deseja atribuir a marca "${nomeMarca}" a ${selecionados.size} produto(s)?`,
      () => atribuirMarcaEmMassa([...selecionados], marcaEscolhida),
      (r) => `Marca "${nomeMarca}" atribuída a ${r.afetados} produto(s).`,
    );
  }

  function lidarComAtribuirCategoria() {
    if (!categoriaEscolhida) {
      setMensagem({ tipo: "erro", texto: "Selecione uma categoria antes de aplicar." });
      return;
    }
    const nomeCategoria = categoriasOrdenadas.find((c) => c.id === categoriaEscolhida)?.nome ?? "";
    executar(
      `Tem certeza que deseja atribuir a categoria "${nomeCategoria}" a ${selecionados.size} produto(s)?`,
      () => atribuirCategoriaEmMassa([...selecionados], categoriaEscolhida),
      (r) => `Categoria "${nomeCategoria}" atribuída a ${r.afetados} produto(s).`,
    );
  }

  function lidarComAjustarEstoque() {
    const valor = Number(valorEstoque);
    if (!valorEstoque.trim() || Number.isNaN(valor) || !Number.isInteger(valor)) {
      setMensagem({ tipo: "erro", texto: "Informe um número inteiro válido para o estoque." });
      return;
    }

    const descricaoAcao =
      modoEstoque === "definir"
        ? `definir o estoque de ${selecionados.size} produto(s) para ${valor}`
        : `${valor >= 0 ? "somar" : "subtrair"} ${Math.abs(valor)} unidade(s) ao estoque de ${selecionados.size} produto(s)`;

    executar(
      `Tem certeza que deseja ${descricaoAcao}? Produtos que ficariam com estoque negativo serão pulados.`,
      () => ajustarEstoqueEmMassa([...selecionados], modoEstoque, valor),
      (r) =>
        `Estoque ajustado em ${r.afetados} produto(s).` +
        (r.ignoradosPorEstoqueNegativo > 0
          ? ` ${r.ignoradosPorEstoqueNegativo} pulado(s) por resultar em estoque negativo.`
          : ""),
    );
  }

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-300"
            checked={todosDaPaginaSelecionados}
            onChange={alternarSelecaoPagina}
          />
          Selecionar todos desta página
        </label>
        {totalFiltrado > produtos.length && (
          <button
            type="button"
            onClick={selecionarTodosOsResultados}
            disabled={carregandoSelecaoTotal}
            className="font-medium text-brand-green hover:underline disabled:opacity-50"
          >
            {carregandoSelecaoTotal
              ? "Carregando..."
              : `Selecionar todos os ${totalFiltrado} resultados deste filtro`}
          </button>
        )}
        {selecionados.size > 0 && (
          <button type="button" onClick={limparSelecao} className="text-muted underline hover:text-ink">
            Limpar seleção ({selecionados.size})
          </button>
        )}
      </div>

      {selecionados.size > 0 && (
        <div className="mt-3 space-y-3 rounded-md border border-brand-green/30 bg-brand-green/5 p-4">
          <p className="text-sm font-medium text-ink">
            {selecionados.size} produto(s) selecionado(s) — ações em massa:
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" disabled={processando} onClick={() => lidarComAtivar(true)}>
              Ativar selecionados
            </Button>
            <Button type="button" variant="outline" disabled={processando} onClick={() => lidarComAtivar(false)}>
              Desativar selecionados
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={marcaEscolhida}
              onChange={(e) => setMarcaEscolhida(e.target.value)}
              className="w-auto min-w-[180px]"
            >
              <option value="">Atribuir marca...</option>
              {marcasOrdenadas.map((marca) => (
                <option key={marca.id} value={marca.id}>
                  {marca.nome}
                </option>
              ))}
            </Select>
            <Button type="button" variant="outline" disabled={processando} onClick={lidarComAtribuirMarca}>
              Aplicar marca
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={categoriaEscolhida}
              onChange={(e) => setCategoriaEscolhida(e.target.value)}
              className="w-auto min-w-[220px]"
            >
              <option value="">Atribuir categoria...</option>
              {categoriasOrdenadas.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {rotuloComIndentacao(categoria)}
                </option>
              ))}
            </Select>
            <Button type="button" variant="outline" disabled={processando} onClick={lidarComAtribuirCategoria}>
              Aplicar categoria
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={modoEstoque}
              onChange={(e) => setModoEstoque(e.target.value as "definir" | "somar")}
              className="w-auto"
            >
              <option value="definir">Definir valor</option>
              <option value="somar">Somar/subtrair quantidade</option>
            </Select>
            <Input
              type="number"
              step="1"
              placeholder={modoEstoque === "definir" ? "novo estoque" : "+10 ou -5"}
              value={valorEstoque}
              onChange={(e) => setValorEstoque(e.target.value)}
              className="w-32"
            />
            <Button type="button" variant="outline" disabled={processando} onClick={lidarComAjustarEstoque}>
              Aplicar estoque
            </Button>
          </div>
        </div>
      )}

      {mensagem && (
        <p className={`mt-3 text-sm ${mensagem.tipo === "sucesso" ? "text-brand-green-dark" : "text-red-600"}`}>
          {mensagem.texto}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-md border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-muted">
            <tr>
              <th className="w-8 px-4 py-3" />
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Marca</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Preço</th>
              <th className="px-4 py-3 font-medium">Estoque</th>
              <th className="px-4 py-3 font-medium">Qualidade</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((produto) => {
              const precisaRevisao = produto.bling_produto_id !== null && !produto.ativo;
              return (
                <tr key={produto.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-300"
                      checked={selecionados.has(produto.id)}
                      onChange={() => alternarSelecaoLinha(produto.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-muted">{produto.sku}</td>
                  <td className="px-4 py-3 font-medium text-ink">{produto.nome}</td>
                  <td className="px-4 py-3 text-muted">{produto.marca?.nome ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{produto.categoria?.nome ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {produto.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className={`px-4 py-3 font-medium ${produto.estoque < 0 ? "text-red-700" : "text-ink"}`}>
                    {produto.estoque}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${classesBadgeQualidade(produto.qualidade)}`}
                    >
                      {produto.qualidade}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          produto.ativo ? "bg-brand-green/10 text-brand-green-dark" : "bg-zinc-200 text-muted"
                        }`}
                      >
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </span>
                      {precisaRevisao && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Do Bling — revisar
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/produtos/${produto.id}/editar`}
                        className="font-medium text-brand-green hover:underline"
                      >
                        Editar
                      </Link>
                      <FormularioExcluirProduto id={produto.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
