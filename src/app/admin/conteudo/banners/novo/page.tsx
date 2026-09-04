import Link from "next/link";
import { FormularioBanner } from "../formulario-banner";
import { criarBanner } from "../actions";

export default function NovoBannerPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Novo banner</h1>
        <Link href="/admin/conteudo/banners" className="text-sm font-medium text-[var(--admin-green-text)] hover:underline">
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-xl rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
        <FormularioBanner action={criarBanner} textoBotao="Publicar banner" />
      </div>
    </div>
  );
}
