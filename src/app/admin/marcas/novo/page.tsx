import Link from "next/link";
import { FormularioMarca } from "../formulario-marca";
import { criarMarca } from "../actions";

export default function NovaMarcaPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Nova marca</h1>
        <Link href="/admin/marcas" className="text-sm font-medium text-[var(--admin-green-text)] hover:underline">
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-md rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
        <FormularioMarca action={criarMarca} textoBotao="Criar marca" />
      </div>
    </div>
  );
}
