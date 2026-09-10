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
  },
  // isomorphic-dompurify (sanitizarDescricaoProduto) usa jsdom no lado
  // servidor. Sem isso, o bundler tenta empacotar jsdom junto com os Server
  // Components e quebra em runtime na Vercel com
  // "ERR_REQUIRE_ESM: require() of ES Module .../@exodus/bytes/encoding-lite.js"
  // (html-encoding-sniffer, dependência do jsdom, é ESM-only e não pode ser
  // exigido via require() depois de empacotado). serverExternalPackages faz
  // esses pacotes ficarem de fora do bundle e serem carregados via
  // require() nativo do Node em runtime, onde ESM/CJS se resolvem
  // normalmente. jsdom já está na lista padrão do Next, mas
  // html-encoding-sniffer (a dependência que efetivamente falha) não está.
  serverExternalPackages: ["jsdom", "html-encoding-sniffer"],
};

export default nextConfig;
