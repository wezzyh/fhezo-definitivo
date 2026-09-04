import Link from "next/link";
import { ImportadorProdutos } from "./importador-produtos";

export default function ImportarProdutosPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Importar produtos (CSV/XLSX)</h1>
        <Link href="/admin/produtos" className="text-sm font-medium text-[var(--admin-green-text)] hover:underline">
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6">
        <ImportadorProdutos />
      </div>
    </div>
  );
}
