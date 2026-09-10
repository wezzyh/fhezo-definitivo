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
} from "@phosphor-icons/react/ssr";

import Image from "next/image";
import Link from "next/link";
import {
  obterFooterPublicado,
  obterArvoreCategoriasPublica,
  obterPaginasInstitucionaisPublicadas,
  obterContatoPublicado,
} from "@/lib/conteudo/consultas";
import { paraTelHref, paraWhatsappHref } from "@/lib/conteudo/telefone";
import type { ImagemFooter } from "@/lib/conteudo/tipos";

// Slugs fixos das 4 páginas institucionais seedadas na migration 0021 —
// só usados aqui para saber se existe uma página real (e ativa) por trás
// de cada label do footer; se o admin desativar uma, o link volta a "#"
// em vez de apontar para uma página que dá 404.
const SLUGS_INSTITUCIONAIS: Record<string, string> = {
  "Sobre nós": "sobre-nos",
  "Política de privacidade": "politica-de-privacidade",
  "Trocas e devoluções": "trocas-e-devolucoes",
  "Termos de uso": "termos-de-uso",
};

// Copiado literalmente de referencia-novo-frontend/src/components/layout/Footer.tsx.
// Diferenças em relação à referência, todas onde ela usava dado mockado:
// - Coluna "Nossos produtos": a referência lista categorias genéricas de
//   e-commerce elétrico que não são o negócio da Fhezo — trocado pelas
//   categorias reais de topo (mesma árvore usada no mega menu do header),
//   com link de verdade em vez de "#".
// - Ícones de forma de pagamento/selos de segurança: a referência aponta
//   pra arquivos que nem existem no projeto original (public/assets/footer/
//   payments|certificates não existe em referencia-novo-frontend/public) —
//   viram dado real, cadastrado em /admin/conteudo/footer. Cada fileira só
//   aparece quando há pelo menos um item cadastrado (ver ponto 2/3 do
//   pedido) — enquanto vazio, o footer funciona normalmente sem essas duas
//   fileiras.
// - Contato/redes sociais: conteudo_site tipo "contato", editável em
//   /admin/conteudo/contato (mesmo dado usado pelo Header, pra nunca
//   divergirem entre si) — a logo usa o arquivo real do projeto em vez do
//   path fictício da referência.
// - Institucional/Central de atendimento continuam com links "#": a
//   referência também não tem páginas reais atrás desses links.
export async function Footer() {
  const [dadosFooter, categorias, paginasInstitucionais, contato] = await Promise.all([
    obterFooterPublicado(),
    obterArvoreCategoriasPublica(),
    obterPaginasInstitucionaisPublicadas(),
    obterContatoPublicado(),
  ]);

  const productLinks = categorias.map((categoria) => ({ label: categoria.label, href: categoria.href }));

  const slugsAtivos = new Set(paginasInstitucionais.map((pagina) => pagina.slug));
  function hrefInstitucional(label: string): string {
    const slug = SLUGS_INSTITUCIONAIS[label];
    return slug && slugsAtivos.has(slug) ? `/institucional/${slug}` : "#";
  }

  const institutionalLinks = [
    "Sobre nós",
    "Nossas lojas",
    "Mapa do site",
    "Blog Fhezo",
    "Política de qualidade",
    "Trabalhe conosco",
  ].map((label) => ({ label, href: hrefInstitucional(label) }));

  const customerLinks = [
    "Minha conta",
    "Meus pedidos",
    "Rastreamento",
    "Política de privacidade",
    "Trocas e devoluções",
    "Termos de uso",
  ].map((label) => ({ label, href: hrefInstitucional(label) }));

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
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG de marca, não precisa do otimizador de imagens */}
            <img
              src="/fhezo-industrial-logo-exact.svg"
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
                href={`tel:${paraTelHref(contato.telefone)}`}
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

                {contato.telefone}
              </a>

              <a
                href={`mailto:${contato.email}`}
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

                {contato.email}
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

                <span>{contato.endereco}</span>
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
              <p className="text-[13px] leading-relaxed text-ink-400">{contato.horarioDias}</p>

              <p className="text-[14px] font-semibold text-ink-100">{contato.horarioHoras}</p>
            </div>

            <a
              href={`https://wa.me/${paraWhatsappHref(contato.whatsapp)}`}
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
          <FooterColumn title="Nossos produtos" items={productLinks} />

          {/* INSTITUCIONAL */}
          <FooterColumn title="Institucional" items={institutionalLinks} />

          {/* ATENDIMENTO */}
          <FooterColumn title="Central de atendimento" items={customerLinks} />
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
              {contato.redesSociais.instagram && (
                <SocialLink href={contato.redesSociais.instagram} label="Instagram" icon={<InstagramLogo size={21} />} />
              )}

              {contato.redesSociais.facebook && (
                <SocialLink href={contato.redesSociais.facebook} label="Facebook" icon={<FacebookLogo size={20} />} />
              )}

              {contato.redesSociais.youtube && (
                <SocialLink href={contato.redesSociais.youtube} label="YouTube" icon={<YoutubeLogo size={22} />} />
              )}

              {contato.redesSociais.tiktok && (
                <SocialLink href={contato.redesSociais.tiktok} label="TikTok" icon={<TiktokLogo size={20} />} />
              )}
            </div>
          </div>

          {/* PAGAMENTOS — só aparece com pelo menos 1 item cadastrado em /admin/conteudo/footer */}
          {dadosFooter.formas_pagamento.length > 0 && (
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
                  gap-x-3 gap-y-3
                "
              >
                {[...dadosFooter.formas_pagamento].sort((a, b) => a.ordem - b.ordem).map((metodo: ImagemFooter) => (
                  <div key={metodo.id} className="relative h-[35px] w-[58px]">
                    <Image
                      src={metodo.imagem_url}
                      alt={metodo.alt}
                      fill
                      sizes="58px"
                      className="
                        object-contain
                        opacity-75
                        grayscale
                        transition
                        duration-200
                        hover:opacity-100
                        hover:grayscale-0
                      "
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEGURANÇA — só aparece com pelo menos 1 item cadastrado em /admin/conteudo/footer */}
          {dadosFooter.selos_seguranca.length > 0 && (
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
                {[...dadosFooter.selos_seguranca].sort((a, b) => a.ordem - b.ordem).map((selo: ImagemFooter) => (
                  <div key={selo.id} className="relative h-[30px] w-[92px]">
                    <Image
                      src={selo.imagem_url}
                      alt={selo.alt}
                      fill
                      sizes="92px"
                      className="object-contain object-left opacity-70 grayscale"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
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
  items: { label: string; href: string }[];
};

function FooterColumn({ title, items }: FooterColumnProps) {
  if (items.length === 0) return null;

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
            <li key={item.label}>
              <Link
                href={item.href}
                className="
                  text-[14px]
                  leading-none
                  text-ink-400
                  transition-colors
                  hover:text-fhezo-400
                "
              >
                {item.label}
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
