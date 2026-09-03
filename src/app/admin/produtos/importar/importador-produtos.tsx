"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  preVisualizarImportacao,
  aplicarImportacao,
  type EstadoPreviewImportacao,
  type EstadoAplicacaoImportacao,
  type ResumoImportacao,
} from "./actions";
import {
  classificarLinha,
  rotuloAcao,
  LIMITE_LINHAS_IMPORTACAO,
  type AcaoLinha,
  type LinhaValidada,
} from "@/lib/produtos/importacao-tipos";

const estadoPreviewInicial: EstadoPreviewImportacao = {};
const estadoAplicacaoInicial: EstadoAplicacaoImportacao = {};

const CLASSES_BADGE_ACAO: Record<AcaoLinha, string> = {
  criar: "bg-brand-green/10 text-brand-green-dark",
  atualizar: "bg-warning/15 text-dark-2",
  erro: "bg-red-100 text-red-800",
  pular_categoria_faltante: "bg-zinc-200 text-muted",
  pular_marca_faltante: "bg-zinc-200 text-muted",
};

export function ImportadorProdutos() {
  const [estadoPreview, formActionPreview, pendentePreview] = useActionState(
    preVisualizarImportacao,
    estadoPreviewInicial,
  );
  const [estadoAplicacao, formActionAplicar, pendenteAplicar] = useActionState(
    aplicarImportacao,
    estadoAplicacaoInicial,
  );

  const [modoCategoriaFaltante, setModoCategoriaFaltante] = useState<"criar" | "pular">("criar");
  const [modoMarcaFaltante, setModoMarcaFaltante] = useState<"criar" | "pular">("criar");

  if (estadoAplicacao.resumo) {
    return <ResumoFinal resumo={estadoAplicacao.resumo} />;
  }

  if (estadoPreview.linhas) {
    return (
      <TelaPreview
        linhas={estadoPreview.linhas}
        linhasOriginaisJson={estadoPreview.linhasOriginaisJson ?? "[]"}
        modoCategoriaFaltante={modoCategoriaFaltante}
        modoMarcaFaltante={modoMarcaFaltante}
        onMudarModoCategoria={setModoCategoriaFaltante}
        onMudarModoMarca={setModoMarcaFaltante}
        formActionAplicar={formActionAplicar}
        pendenteAplicar={pendenteAplicar}
        erroAplicacao={estadoAplicacao.erroGeral}
      />
    );
  }

  return (
    <form action={formActionPreview} className="max-w-2xl space-y-4 rounded-md border border-zinc-200 bg-white p-6">
      <div>
        <label htmlFor="arquivo" className="mb-1 block text-sm font-medium text-ink">
          Arquivo CSV ou XLSX
        </label>
        <input
          id="arquivo"
          name="arquivo"
          type="file"
          accept=".csv,.xlsx,.xls"
          required
          className="block w-full text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-brand-green file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-green-dark"
        />
        <p className="mt-2 text-xs text-muted">
          Colunas esperadas: sku, nome, categoria, marca, preco, estoque, peso_kg, altura_cm, largura_cm,
          comprimento_cm, ean, ncm, descricao. Só sku, nome, preco e estoque são obrigatórios. Limite de{" "}
          {LIMITE_LINHAS_IMPORTACAO} linhas por importação.
        </p>
        <a
          href="/admin/produtos/importar/modelo"
          className="mt-2 inline-block text-sm font-medium text-brand-green hover:underline"
        >
          Baixar modelo de exemplo (.csv)
        </a>
      </div>

      {estadoPreview.erroGeral && <p className="text-sm text-red-600">{estadoPreview.erroGeral}</p>}

      <Button type="submit" variant="primary" disabled={pendentePreview}>
        {pendentePreview ? "Analisando..." : "Analisar arquivo"}
      </Button>
    </form>
  );
}

interface TelaPreviewProps {
  linhas: LinhaValidada[];
  linhasOriginaisJson: string;
  modoCategoriaFaltante: "criar" | "pular";
  modoMarcaFaltante: "criar" | "pular";
  onMudarModoCategoria: (modo: "criar" | "pular") => void;
  onMudarModoMarca: (modo: "criar" | "pular") => void;
  formActionAplicar: (formData: FormData) => void;
  pendenteAplicar: boolean;
  erroAplicacao?: string;
}

function TelaPreview({
  linhas,
  linhasOriginaisJson,
  modoCategoriaFaltante,
  modoMarcaFaltante,
  onMudarModoCategoria,
  onMudarModoMarca,
  formActionAplicar,
  pendenteAplicar,
  erroAplicacao,
}: TelaPreviewProps) {
  const opcoes = { modoCategoriaFaltante, modoMarcaFaltante };

  const linhasComAcao = useMemo(
    () => linhas.map((linha) => ({ linha, acao: classificarLinha(linha, opcoes) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `opcoes` é recriado a cada render de propósito (vem de dois state primitivos)
    [linhas, modoCategoriaFaltante, modoMarcaFaltante],
  );

  const contagens = useMemo(() => {
    const c: Record<AcaoLinha, number> = {
      criar: 0,
      atualizar: 0,
      erro: 0,
      pular_categoria_faltante: 0,
      pular_marca_faltante: 0,
    };
    linhasComAcao.forEach(({ acao }) => c[acao]++);
    return c;
  }, [linhasComAcao]);

  const temCategoriaFaltante = linhas.some((l) => l.categoriaFaltante);
  const temMarcaFaltante = linhas.some((l) => l.marcaFaltante);
  const totalAImportar = contagens.criar + contagens.atualizar;

  function confirmarAntesDeSubmeter(evento: React.FormEvent<HTMLFormElement>) {
    const confirmou = window.confirm(
      `Confirmar importação de ${totalAImportar} produto(s) — ${contagens.criar} novo(s) (inativo(s), aguardando revisão) e ${contagens.atualizar} atualizado(s)? Esta ação grava direto no catálogo.`,
    );
    if (!confirmou) evento.preventDefault();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-zinc-200 bg-white p-6">
        <p className="text-sm font-medium text-ink">
          {linhas.length} linha(s) analisada(s): <span className="text-brand-green-dark">{contagens.criar} novo(s)</span>
          {", "}
          <span className="text-dark-2">{contagens.atualizar} atualização(ões)</span>
          {", "}
          <span className="text-red-700">{contagens.erro} com erro</span>
          {contagens.pular_categoria_faltante + contagens.pular_marca_faltante > 0 && (
            <>, <span className="text-muted">{contagens.pular_categoria_faltante + contagens.pular_marca_faltante} pulada(s)</span></>
          )}
          .
        </p>
        <p className="mt-1 text-xs text-muted">
          Todo produto NOVO é criado inativo, aguardando revisão manual em /admin/produtos — igual à
          sincronização com o Bling — mesmo que todos os campos tenham vindo preenchidos.
        </p>

        {(temCategoriaFaltante || temMarcaFaltante) && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {temCategoriaFaltante && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Categorias que não existem ainda
                </label>
                <Select
                  value={modoCategoriaFaltante}
                  onChange={(e) => onMudarModoCategoria(e.target.value as "criar" | "pular")}
                >
                  <option value="criar">Criar automaticamente</option>
                  <option value="pular">Pular linhas com categoria desconhecida</option>
                </Select>
              </div>
            )}
            {temMarcaFaltante && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Marcas que não existem ainda</label>
                <Select
                  value={modoMarcaFaltante}
                  onChange={(e) => onMudarModoMarca(e.target.value as "criar" | "pular")}
                >
                  <option value="criar">Criar automaticamente</option>
                  <option value="pular">Pular linhas com marca desconhecida</option>
                </Select>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="max-h-[32rem] overflow-auto rounded-md border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Linha</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {linhasComAcao.map(({ linha, acao }) => (
              <tr key={linha.numeroLinha} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3 text-muted">{linha.numeroLinha}</td>
                <td className="px-4 py-3 font-medium text-muted">{linha.sku || "—"}</td>
                <td className="px-4 py-3 font-medium text-ink">{linha.nome || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLASSES_BADGE_ACAO[acao]}`}>
                    {rotuloAcao(acao)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {linha.erros.length > 0
                    ? linha.erros.join(" ")
                    : linha.categoriaFaltante
                      ? `Categoria "${linha.categoriaTexto}" não existe.`
                      : linha.marcaFaltante
                        ? `Marca "${linha.marcaTexto}" não existe.`
                        : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {erroAplicacao && <p className="text-sm text-red-600">{erroAplicacao}</p>}

      <div className="flex items-center gap-3">
        <form action={formActionAplicar} onSubmit={confirmarAntesDeSubmeter}>
          <input type="hidden" name="dados" value={linhasOriginaisJson} />
          <input type="hidden" name="modo_categoria" value={modoCategoriaFaltante} />
          <input type="hidden" name="modo_marca" value={modoMarcaFaltante} />
          <Button type="submit" variant="primary" disabled={pendenteAplicar || totalAImportar === 0}>
            {pendenteAplicar ? "Aplicando..." : `Confirmar importação (${totalAImportar})`}
          </Button>
        </form>
        <Link href="/admin/produtos/importar" className="text-sm font-medium text-muted underline hover:text-ink">
          Cancelar e escolher outro arquivo
        </Link>
      </div>
    </div>
  );
}

function ResumoFinal({ resumo }: { resumo: ResumoImportacao }) {
  return (
    <div className="max-w-2xl space-y-4 rounded-md border border-zinc-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-ink">Importação concluída</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-2xl font-medium text-brand-green-dark">{resumo.criados}</p>
          <p className="text-xs text-muted">criado(s)</p>
        </div>
        <div>
          <p className="text-2xl font-medium text-dark-2">{resumo.atualizados}</p>
          <p className="text-xs text-muted">atualizado(s)</p>
        </div>
        <div>
          <p className="text-2xl font-medium text-muted">{resumo.pulados}</p>
          <p className="text-xs text-muted">pulado(s)</p>
        </div>
        <div>
          <p className="text-2xl font-medium text-red-700">{resumo.falharam.length}</p>
          <p className="text-xs text-muted">falharam</p>
        </div>
      </div>

      {(resumo.categoriasCriadas.length > 0 || resumo.marcasCriadas.length > 0) && (
        <div className="text-sm text-muted">
          {resumo.categoriasCriadas.length > 0 && (
            <p>Categorias criadas: {resumo.categoriasCriadas.join(", ")}</p>
          )}
          {resumo.marcasCriadas.length > 0 && <p>Marcas criadas: {resumo.marcasCriadas.join(", ")}</p>}
        </div>
      )}

      {resumo.falharam.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink">Linhas que falharam:</p>
          <div className="mt-2 max-h-64 overflow-auto rounded-md border border-red-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-red-200 bg-red-50 text-xs uppercase text-red-800">
                <tr>
                  <th className="px-3 py-2 font-medium">Linha</th>
                  <th className="px-3 py-2 font-medium">SKU</th>
                  <th className="px-3 py-2 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {resumo.falharam.map((falha) => (
                  <tr key={falha.linha} className="border-b border-red-100 last:border-0">
                    <td className="px-3 py-2 text-muted">{falha.linha}</td>
                    <td className="px-3 py-2 font-medium text-ink">{falha.sku}</td>
                    <td className="px-3 py-2 text-red-700">{falha.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/admin/produtos">
          <Button variant="primary">Ver produtos</Button>
        </Link>
        <Link href="/admin/produtos/importar" className="text-sm font-medium text-brand-green hover:underline">
          Importar outro arquivo
        </Link>
      </div>
    </div>
  );
}
