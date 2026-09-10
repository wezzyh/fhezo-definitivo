import type { NextConfig } from "next";

// Todas as imagens cadastradas pelo admin (produtos, categorias, marcas,
// banners, footer) e as importadas do Bling passam pelo bucket próprio
// "admin-imagens" do Storage do Supabase antes de gravar `imagem_url` — ver
// src/components/admin/upload-imagem.tsx e
// src/lib/integracoes/bling-imagens.ts (rehospedarImagemBling). Ou seja, o
// domínio de toda imagem pública do site é sempre o do próprio projeto
// Supabase, não um domínio arbitrário — dá pra liberar next/image com um
// remotePattern único e seguro, em vez de precisar de "**" (qualquer host).
const hostnameSupabase = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: hostnameSupabase
      ? [
          {
            protocol: "https",
            hostname: hostnameSupabase,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
    // Next 16 restringe a qualidade padrão a [75] (ver changelog da v16).
    // 90 é usado nos banners full-bleed (hero-banner.tsx,
    // faixa-institucional.tsx) — imagens exibidas quase na largura total
    // da tela, onde compressão perceptível fica mais visível. Não elimina
    // o problema de fundo (o arquivo de origem do banner atual tem só
    // 1200×400px, menor que a largura de exibição em monitor grande —
    // isso só se resolve subindo uma imagem maior em /admin/conteudo/banners,
    // recomendo pelo menos ~2400px de largura), mas evita comprimir de novo
    // por cima de uma imagem que já é pequena.
    qualities: [75, 90],
  },
};

export default nextConfig;
