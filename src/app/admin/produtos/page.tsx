import Link from "next/link";
import { Button } from "@/components/ui/button";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { buscarIdMarcaPadrao, buscarIdCategoriaPadrao } from "@/lib/produtos/padroes";
import { encontrarDuplicatas, type IdentificadoresProduto } from "@/lib/produtos/duplicatas";
import { calcularQualidadeProduto } from "@/lib/produtos/qualidade";
import { PROBLEMAS, normalizarProblemasAtivos, construirTermosOr, type IdProblema } from "@/lib/produtos/filtros";
import { TabelaProdutos, type ProdutoDaListagem } from "./tabela-produtos";
import type { Marca, Categoria, Produto } from "@/types/database";

const TAMANHO_PAGINA = 50;

interface ProdutoComRelacoes extends Produto {
  marca: { nome: string } | null;
  categoria: { nome: string } | null;
}

interface AdminProdutosPageProps {
  searchParams: Promise<{
    revisao?: string;
    pagina?: string;
    problema?: string | string[];
  }>;
}

function construirHref(params: { problemas: IdProblema[]; revisaoAtiva: boolean; pagina?: number }): string {
  const query = new URLSearchParams();
  params.problemas.forEach((problema) => query.append("problema", problema));
  if (params.revisaoAtiva) query.set("revisao", "1");
  if (params.pagina && params.pagina > 1) query.set("pagina", String(params.pagina));

  const texto = query.toString();
  return `/admin/produtos${texto ? `?${texto}` : ""}`;
}

export default async function AdminProdutosPage({ searchParams }: AdminProdutosPageProps) {
  const { revisao, pagina: paginaBruta, problema: problemaBruto } = await searchParams;

  const somenteRevisao = revisao === "1";
  const paginaAtual = Math.max(1, Number(paginaBruta) || 1);
  const problemasAtivos = normalizarProblemasAtivos(problemaBruto);

  const supabase = await criarClienteSupabaseServidor();

  // Ver comentário de performance em src/lib/produtos/filtros.ts e
  // duplicatas.ts: só a varredura (id, sku, ean) cresce com o total de
  // produtos independente da paginação — necessário pra detectar
  // duplicatas, que são uma propriedade relativa a TODOS os produtos.
  const [idMarcaPadrao, idCategoriaPadrao, { count: contagemPendentesRevisao }, { data: identificadores }, { data: marcas }, { data: categorias }] =
    await Promise.all([
      buscarIdMarcaPadrao(supabase),
      buscarIdCategoriaPadrao(supabase),
      supabase
        .from("produtos")
        .select("id", { count: "exact", head: true })
        .not("bling_produto_id", "is", null)
        .eq("ativo", false),
      supabase.from("produtos").select("id, sku, ean").returns<IdentificadoresProduto[]>(),
      supabase.from("marcas").select("*").order("nome").returns<Marca[]>(),
      supabase.from("categorias").select("*").returns<Categoria[]>(),
    ]);

  const duplicatas = encontrarDuplicatas(identificadores ?? []);

  let query = supabase
    .from("produtos")
    .select("*, marca:marcas(nome), categoria:categorias(nome)", { count: "exact" });

  if (somenteRevisao) {
    query = query.not("bling_produto_id", "is", null).eq("ativo", false);
  }

  const termosOr = construirTermosOr(problemasAtivos, { idMarcaPadrao, idCategoriaPadrao, duplicatas });
  if (termosOr.length > 0) {
    query = query.or(termosOr.join(","));
  }

  const de = (paginaAtual - 1) * TAMANHO_PAGINA;
  const ate = de + TAMANHO_PAGINA - 1;

  const {
    data: produtosBrutos,
    error,
    count: totalFiltrado,
  } = await query
    .order("created_at", { ascending: false })
    .range(de, ate)
    .returns<ProdutoComRelacoes[]>();

  const produtos: ProdutoDaListagem[] = (produtosBrutos ?? []).map((produto) => ({
    ...produto,
    qualidade: calcularQualidadeProduto(produto, {
      marcaSemMarcaId: idMarcaPadrao,
      categoriaSemCategoriaId: idCategoriaPadrao,
    }).score,
  }));

  const totalPaginas = Math.max(1, Math.ceil((totalFiltrado ?? 0) / TAMANHO_PAGINA));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Produtos</h1>
        <div className="flex gap-2">
          <Link href="/admin/produtos/importar">
            <Button variant="outline">Importar CSV/XLSX</Button>
          </Link>
          <Link href="/admin/produtos/novo">
            <Button variant="primary">+ Novo produto</Button>
          </Link>
        </div>
      </div>

      {contagemPendentesRevisao !== null && contagemPendentesRevisao > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            <strong>{contagemPendentesRevisao}</strong> produto(s) importado(s) do Bling aguardando
            revisão (categoria, preço, peso/dimensões, fotos) antes de ativar.
          </p>
          <Link
            href={construirHref({ problemas: problemasAtivos, revisaoAtiva: !somenteRevisao })}
            className="shrink-0 text-sm font-medium text-amber-900 underline hover:no-underline"
          >
            {somenteRevisao ? "Ver todos os produtos" : "Ver só os pendentes de revisão"}
          </Link>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {PROBLEMAS.map((problema) => {
          const ativo = problemasAtivos.includes(problema.id);
          const contagemExtra =
            problema.id === "sku_duplicado"
              ? duplicatas.skuDuplicado.size
              : problema.id === "ean_duplicado"
                ? duplicatas.eanDuplicado.size
                : null;

          return (
            <Link
              key={problema.id}
              href={construirHref({
                problemas: ativo
                  ? problemasAtivos.filter((p) => p !== problema.id)
                  : [...problemasAtivos, problema.id],
                revisaoAtiva: somenteRevisao,
              })}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                ativo
                  ? "border-brand-green bg-brand-green/10 text-brand-green-dark"
                  : "border-zinc-300 text-muted hover:border-brand-green hover:text-brand-green"
              }`}
            >
              {problema.rotulo}
              {contagemExtra !== null && contagemExtra > 0 && ` (${contagemExtra})`}
            </Link>
          );
        })}
        {problemasAtivos.length > 0 && (
          <Link
            href={construirHref({ problemas: [], revisaoAtiva: somenteRevisao })}
            className="rounded-full px-3 py-1 text-xs font-medium text-muted underline hover:text-ink"
          >
            Limpar filtros
          </Link>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">Erro ao carregar produtos: {error.message}</p>}

      {!error && produtos.length === 0 && (
        <p className="mt-6 text-sm text-muted">
          {problemasAtivos.length > 0 || somenteRevisao
            ? "Nenhum produto encontrado com esses filtros."
            : "Nenhum produto cadastrado ainda."}
        </p>
      )}

      {produtos.length > 0 && (
        <TabelaProdutos
          produtos={produtos}
          marcas={marcas ?? []}
          categorias={categorias ?? []}
          totalFiltrado={totalFiltrado ?? produtos.length}
          somenteRevisao={somenteRevisao}
          problemasAtivos={problemasAtivos}
        />
      )}

      {produtos.length > 0 && totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>
            Página {paginaAtual} de {totalPaginas} ({totalFiltrado} produto(s))
          </span>
          <div className="flex gap-3">
            {paginaAtual > 1 && (
              <Link
                href={construirHref({ problemas: problemasAtivos, revisaoAtiva: somenteRevisao, pagina: paginaAtual - 1 })}
                className="font-medium text-brand-green hover:underline"
              >
                ← Anterior
              </Link>
            )}
            {paginaAtual < totalPaginas && (
              <Link
                href={construirHref({ problemas: problemasAtivos, revisaoAtiva: somenteRevisao, pagina: paginaAtual + 1 })}
                className="font-medium text-brand-green hover:underline"
              >
                Próxima →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
