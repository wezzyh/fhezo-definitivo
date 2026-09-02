import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
