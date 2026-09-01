// TODO: verificar aqui se o usuário autenticado tem sessão válida no Supabase Auth
// e permissão de administrador (ex.: checar tabela de perfis/roles) antes de
// renderizar esta página. Por enquanto a rota está aberta, apenas com a
// estrutura visual do dashboard.

const cartoesResumo = [
  { titulo: "Produtos cadastrados", valor: "—" },
  { titulo: "Pedidos em aberto", valor: "—" },
  { titulo: "Clientes ativos", valor: "—" },
];

export default function PaginaAdmin() {
  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <h1 className="text-lg font-bold text-zinc-900">Painel Administrativo — FHEZO</h1>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {cartoesResumo.map((cartao) => (
            <div key={cartao.titulo} className="rounded-lg border border-zinc-200 bg-white p-5">
              <p className="text-sm text-zinc-500">{cartao.titulo}</p>
              <p className="mt-2 text-2xl font-bold text-zinc-900">{cartao.valor}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          Área de gestão de produtos, pedidos e clientes será implementada aqui.
        </div>
      </div>
    </div>
  );
}
