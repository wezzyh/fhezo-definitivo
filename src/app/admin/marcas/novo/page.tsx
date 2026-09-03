import Link from "next/link";
import { FormularioMarca } from "../formulario-marca";
import { criarMarca } from "../actions";

export default function NovaMarcaPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Nova marca</h1>
        <Link href="/admin/marcas" className="text-sm font-medium text-brand-green hover:underline">
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-md rounded-md border border-zinc-200 bg-white p-6">
        <FormularioMarca action={criarMarca} textoBotao="Criar marca" />
      </div>
    </div>
  );
}
