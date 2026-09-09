import Link from "next/link";
import { FormularioPagina } from "../formulario-pagina";
import { criarPagina } from "../actions";

export default function NovaPaginaPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Nova página institucional</h1>
        <Link
          href="/admin/conteudo/paginas"
          className="text-sm font-medium text-[var(--admin-green-text)] hover:underline"
        >
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-2xl rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
        <FormularioPagina action={criarPagina} textoBotao="Salvar página" />
      </div>
    </div>
  );
}
