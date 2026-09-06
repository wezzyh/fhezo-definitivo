import { CreditCard, ShieldCheck, Tag, Truck } from "@phosphor-icons/react/ssr";

// Copiado literalmente de
// referencia-novo-frontend/src/components/home/BenefitsStrip.tsx —
// componente estava totalmente ausente na integração anterior. Sem fonte
// de dado real para esses textos (são claims de marketing fixos na
// referência, não dado de produto/pedido), mantidos exatamente como na
// referência.
const beneficios = [
  {
    icon: ShieldCheck,
    title: "Compra 100% segura",
  },
  {
    icon: CreditCard,
    title: "Até 6x sem juros",
  },
  {
    icon: Truck,
    title: "Entrega no dia em Curitiba e região",
  },
  {
    icon: Tag,
    title: "Melhores preços no atacado",
  },
];

export function FaixaBeneficios() {
  return (
    <section className="bg-[#EDFCE3]">
      <div
        className="
          fhezo-container
          flex min-h-[40px]
          flex-wrap
          items-center
          justify-center
          gap-2.5
          py-1
        "
      >
        {beneficios.map(({ icon: Icon, title }) => (
          <div
            key={title}
            className="
              flex min-h-[40px]
              items-center
              justify-center
              gap-2
              px-2
              text-center
            "
          >
            <Icon size={29} weight="regular" className="shrink-0 text-fhezo-600" />

            <div className="leading-tight">
              <p className="text-sm font-semibold text-ink-900">{title}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
