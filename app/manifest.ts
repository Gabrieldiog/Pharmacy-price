import type { MetadataRoute } from "next";

// gerado uma vez no build (site estatico, output: export)
export const dynamic = "force-static";

// Manifest basico: nome, icones, cores. Sem service worker — nao e um PWA offline,
// so dá uma cara acabada pro "adicionar a tela inicial" no celular (nome + icone
// certos) em vez do padrao do navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pharmacy-price — o preço justo do seu remédio",
    short_name: "Pharmacy-price",
    description:
      "Compare o preço de medicamentos com o teto legal da Anvisa (CMED) e veja o que é de graça no Farmácia Popular.",
    start_url: "/",
    display: "standalone",
    lang: "pt-BR",
    background_color: "#f5f8f9",
    theme_color: "#0f766e",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/icon.png", type: "image/png", sizes: "32x32" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
      // 512 full-bleed serve pro icone da tela inicial no Android ficar nitido e
      // preencher a mascara (maskable) em vez de aparecer numa placa quadrada.
      { src: "/icon-512.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
    ],
  };
}
