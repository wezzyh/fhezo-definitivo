import {
  Cube,
  Heart,
  MapPin,
  UserCircle,
} from "@phosphor-icons/react";

export default function AccountPage() {
  return (
    <main className="py-10">
      <div className="fhezo-container">
        <h1
          className="
            font-display
            text-[30px]
            font-semibold
            text-ink-900
          "
        >
          Minha Conta
        </h1>

        <div
          className="
            mt-7
            grid gap-6
            lg:grid-cols-[260px_minmax(0,1fr)]
          "
        >
          <aside
            className="
              self-start
              border border-ink-200
              bg-white
            "
          >
            <div
              className="
                border-b border-ink-200
                px-5 py-5
              "
            >
              <p className="text-sm text-ink-500">
                Olá,
              </p>

              <strong className="text-lg">
                Visitante
              </strong>
            </div>

            <nav className="p-2">
              {[
                [UserCircle, "Dados pessoais"],
                [Cube, "Meus pedidos"],
                [Heart, "Favoritos"],
                [MapPin, "Endereços"],
              ].map(([Icon, label]: any) => (
                <button
                  key={label}
                  className="
                    flex w-full
                    items-center gap-3
                    px-3 py-3
                    text-left
                    text-sm
                    text-ink-700
                    transition
                    hover:bg-warm-100
                  "
                >
                  <Icon size={21} />
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          <section
            className="
              border border-ink-200
              bg-white
              p-6
            "
          >
            <h2
              className="
                font-display
                text-2xl
                font-semibold
              "
            >
              Dados pessoais
            </h2>

            <p className="mt-1 text-sm text-ink-500">
              Gerencie os dados utilizados em seus pedidos.
            </p>

            <div
              className="
                mt-7
                grid gap-5
                md:grid-cols-2
              "
            >
              {[
                "Nome completo",
                "E-mail",
                "Telefone",
                "CPF / CNPJ",
              ].map((label) => (
                <label key={label}>
                  <span
                    className="
                      mb-2 block
                      text-sm
                      font-semibold
                    "
                  >
                    {label}
                  </span>

                  <input
                    className="
                      h-12 w-full
                      border border-ink-300
                      px-4
                      outline-none
                      focus:border-fhezo-600
                    "
                  />
                </label>
              ))}
            </div>

            <button
              className="
                mt-6 h-12
                bg-fhezo-600
                px-7
                font-display
                font-semibold
                uppercase
                text-white
                transition
                hover:bg-fhezo-700
              "
            >
              Salvar alterações
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}