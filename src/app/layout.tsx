import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { obterTemaPublicado } from "@/lib/conteudo/consultas";

// Peso 400 = texto corrido; 500 = labels/preços/SKU/códigos técnicos;
// 600 = apenas títulos de seção. Nenhum outro peso deve ser usado no site.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "FHEZO Industrial",
  description:
    "E-commerce industrial de rolamentos, engrenagens, correntes, graxas, ferramentas, parafusos e porcas especiais.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Tokens de cor editáveis em /admin/conteudo/tema (conteudo_site, tipo
  // "tema") — sobrescreve as variáveis CSS de globals.css via um <style>
  // inline. Fica no início do <body> (não em <head>) porque o Next.js App
  // Router não permite adicionar um <head> manual no layout raiz; um
  // <style> em qualquer lugar do documento se aplica normalmente.
  const tema = await obterTemaPublicado();
  const variaveisCss = `:root{--color-brand-green:${tema.cores.brand_green};--color-brand-green-dark:${tema.cores.brand_green_dark};--color-dark:${tema.cores.dark};--color-dark-2:${tema.cores.dark_2};--color-page:${tema.cores.page};--color-ink:${tema.cores.ink};--color-muted:${tema.cores.muted};--color-warning:${tema.cores.warning};}`;

  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <style>{variaveisCss}</style>
        {children}
      </body>
    </html>
  );
}
