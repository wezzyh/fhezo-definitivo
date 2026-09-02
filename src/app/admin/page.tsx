// TODO: quando houver mais de um administrador, adicionar aqui (ou no
// proxy, em src/proxy.ts) uma checagem de "role"/permissão, além da
// simples autenticação — hoje existe um único usuário admin.

const cartoesResumo = [
  { titulo: "Produtos cadastrados", valor: "—" },
  { titulo: "Pedidos em aberto", valor: "—" },
  { titulo: "Clientes ativos", valor: "—" },
];

export default function PaginaAdmin() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cartoesResumo.map((cartao) => (
          <div key={cartao.titulo} className="rounded-md border border-zinc-200 bg-white p-5">
            <p className="text-sm font-medium text-muted">{cartao.titulo}</p>
            <p className="mt-2 text-2xl font-medium text-ink">{cartao.valor}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-md border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-muted">
        Área de gestão de produtos, pedidos e clientes será implementada aqui.
      </div>
    </div>
  );
}
