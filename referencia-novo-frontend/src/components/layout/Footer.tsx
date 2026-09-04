import {
  ArrowUpRight,
  EnvelopeSimple,
  FacebookLogo,
  InstagramLogo,
  MapPin,
  Phone,
  TiktokLogo,
  WhatsappLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";

import { Link } from "react-router-dom";

const productLinks = [
  "Automação industrial",
  "Cabos elétricos",
  "EPIs",
  "Iluminação",
  "Infraestrutura de rede",
  "Material elétrico",
];

const institutionalLinks = [
  "Quem somos",
  "Nossas lojas",
  "Mapa do site",
  "Blog Fhezo",
  "Política de qualidade",
  "Trabalhe conosco",
];

const customerLinks = [
  "Minha conta",
  "Meus pedidos",
  "Rastreamento",
  "Política de privacidade",
  "Trocas e devoluções",
  "Termos de uso",
];

const paymentMethods = [
  {
    src: "/assets/footer/payments/visa.svg",
    alt: "Visa",
  },
  {
    src: "/assets/footer/payments/mastercard.svg",
    alt: "Mastercard",
  },
  {
    src: "/assets/footer/payments/amex.svg",
    alt: "American Express",
  },
  {
    src: "/assets/footer/payments/elo.svg",
    alt: "Elo",
  },
  {
    src: "/assets/footer/payments/boleto.svg",
    alt: "Boleto",
  },
  {
    src: "/assets/footer/payments/pix.svg",
    alt: "Pix",
  },
];

const certifications = [
  {
    src: "/assets/footer/certificates/ssl.svg",
    alt: "Site seguro SSL",
  },
  {
    src: "/assets/footer/certificates/google-safe.svg",
    alt: "Google Safe Browsing",
  },
];

export default function Footer() {
  return (
    <footer className="mt-14 bg-ink-950 text-white">
      {/* CONTEÚDO PRINCIPAL */}
      <div className="fhezo-container">
        <div
          className="
            grid
            gap-x-12 gap-y-9
            py-10
            md:grid-cols-2
            lg:grid-cols-[1.25fr_.85fr_.85fr_.95fr]
            xl:gap-x-16
          "
        >
          {/* CONTATO */}
          <div>
            <img
              src="/assets/brand/fhezo-logo.svg"
              alt="Fhezo Industrial"
              className="
                h-auto
                w-[168px]
                object-contain
                object-left
              "
            />

            <p
              className="
                mt-5
                max-w-[330px]
                text-[14px]
                leading-[1.55]
                text-ink-300
              "
            >
              Atendimento comercial e técnico para indústrias,
              empresas e profissionais.
            </p>

            <div className="mt-5 space-y-3">
              <a
                href="tel:+55419935156006"
                className="
                  group
                  flex w-fit
                  items-center gap-3
                  text-[14px]
                  font-semibold
                  text-white
                  transition-colors
                  hover:text-fhezo-400
                "
              >
                <Phone
                  size={18}
                  weight="regular"
                  className="text-fhezo-400"
                />

                (51) 99351-56006
              </a>

              <a
                href="mailto:sac@fhezo.com.br"
                className="
                  flex w-fit
                  items-center gap-3
                  text-[14px]
                  text-ink-300
                  transition-colors
                  hover:text-white
                "
              >
                <EnvelopeSimple
                  size={18}
                  className="text-fhezo-500"
                />

                sac@fhezo.com.br
              </a>

              <div
                className="
                  flex items-start gap-3
                  text-[14px]
                  text-ink-300
                "
              >
                <MapPin
                  size={18}
                  className="mt-[1px] shrink-0 text-fhezo-500"
                />

                <span>Curitiba - PR e região</span>
              </div>
            </div>

            <div
              className="
                mt-5
                border-l-2
                border-fhezo-600
                pl-4
              "
            >
              <p className="text-[13px] leading-relaxed text-ink-400">
                Segunda a sexta-feira
              </p>

              <p className="text-[14px] font-semibold text-ink-100">
                08:00 às 17:30
              </p>
            </div>

            <a
              href="https://wa.me/55419935156006"
              target="_blank"
              rel="noreferrer"
              className="
                mt-5
                inline-flex
                items-center gap-2
                text-[14px]
                font-semibold
                text-fhezo-400
                transition-colors
                hover:text-fhezo-300
              "
            >
              <WhatsappLogo size={18} weight="fill" />

              Fale com nosso atendimento

              <ArrowUpRight size={14} />
            </a>
          </div>

          {/* PRODUTOS */}
          <FooterColumn
            title="Nossos produtos"
            items={productLinks}
          />

          {/* INSTITUCIONAL */}
          <FooterColumn
            title="Institucional"
            items={institutionalLinks}
          />

          {/* ATENDIMENTO */}
          <FooterColumn
            title="Central de atendimento"
            items={customerLinks}
          />
        </div>

        {/* LINHA INFERIOR */}
        <div
          className="
            grid
            gap-7
            border-t
            border-white/[.09]
            py-7
            md:grid-cols-2
            lg:grid-cols-[.75fr_1.4fr_.85fr]
            lg:items-center
          "
        >
          {/* SOCIAL */}
          <div>
            <p
              className="
                font-display
                text-[13px]
                font-semibold
                uppercase
                tracking-[.08em]
                text-ink-300
              "
            >
              Redes sociais
            </p>

            <div className="mt-3 flex items-center gap-4">
              <SocialLink
                href="#"
                label="Instagram"
                icon={<InstagramLogo size={21} />}
              />

              <SocialLink
                href="#"
                label="Facebook"
                icon={<FacebookLogo size={20} />}
              />

              <SocialLink
                href="#"
                label="YouTube"
                icon={<YoutubeLogo size={22} />}
              />

              <SocialLink
                href="#"
                label="TikTok"
                icon={<TiktokLogo size={20} />}
              />
            </div>
          </div>

          {/* PAGAMENTOS */}
          <div>
            <p
              className="
                font-display
                text-[13px]
                font-semibold
                uppercase
                tracking-[.08em]
                text-ink-300
              "
            >
              Formas de pagamento
            </p>

            <div
              className="
                mt-3
                flex
                flex-wrap
                items-center
                gap-x-5 gap-y-3
              "
            >
              {paymentMethods.map((method) => (
                <img
                  key={method.alt}
                  src={method.src}
                  alt={method.alt}
                  loading="lazy"
                  className="
                    h-[22px]
                    w-auto
                    max-w-[58px]
                    object-contain
                    opacity-75
                    grayscale
                    transition
                    duration-200
                    hover:opacity-100
                    hover:grayscale-0
                  "
                />
              ))}
            </div>
          </div>

          {/* SEGURANÇA */}
          <div className="lg:justify-self-end">
            <p
              className="
                font-display
                text-[13px]
                font-semibold
                uppercase
                tracking-[.08em]
                text-ink-300
              "
            >
              Compra segura
            </p>

            <div className="mt-3 flex items-center gap-5">
              {certifications.map((certificate) => (
                <img
                  key={certificate.alt}
                  src={certificate.src}
                  alt={certificate.alt}
                  loading="lazy"
                  className="
                    h-[30px]
                    max-w-[92px]
                    object-contain
                    object-left
                    opacity-70
                    grayscale
                  "
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* LEGAL */}
      <div className="border-t border-white/[.06] bg-[#070a08]">
        <div
          className="
            fhezo-container
            flex
            flex-col
            gap-3
            py-4
            text-[11px]
            leading-relaxed
            text-ink-500
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >
          <p>
            © {new Date().getFullYear()} Fhezo Industrial.
            Todos os direitos reservados.
          </p>

          <p className="max-w-[840px] lg:text-right">
            Preços, condições de pagamento e disponibilidade
            podem sofrer alterações sem aviso prévio.
          </p>
        </div>
      </div>
    </footer>
  );
}

type FooterColumnProps = {
  title: string;
  items: string[];
};

function FooterColumn({
  title,
  items,
}: FooterColumnProps) {
  return (
    <div>
      <h2
        className="
          font-display
          text-[16px]
          font-semibold
          tracking-[.01em]
          text-white
        "
      >
        {title}
      </h2>

      <div
        className="
          mt-4
          h-[2px]
          w-8
          bg-fhezo-600
        "
      />

      <nav className="mt-5">
        <ul className="space-y-[10px]">
          {items.map((item) => (
            <li key={item}>
              <Link
                to="#"
                className="
                  text-[14px]
                  leading-none
                  text-ink-400
                  transition-colors
                  hover:text-fhezo-400
                "
              >
                {item}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

type SocialLinkProps = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function SocialLink({
  href,
  label,
  icon,
}: SocialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="
        text-ink-300
        transition
        duration-150
        hover:-translate-y-[1px]
        hover:text-fhezo-400
      "
    >
      {icon}
    </a>
  );
}