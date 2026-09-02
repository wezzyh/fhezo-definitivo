import Link from "next/link";
import { FormularioProduto } from "../formulario-produto";
import { criarProduto } from "../actions";

export default function NovoProdutoPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Novo produto</h1>
        <Link
          href="/admin/produtos"
          className="text-sm font-medium text-brand-green hover:underline"
        >
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-2xl rounded-md border border-zinc-200 bg-white p-6">
        <FormularioProduto action={criarProduto} textoBotao="Criar produto" />
      </div>
    </div>
  );
}
