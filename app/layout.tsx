import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

// URL de producao pra os links absolutos do OpenGraph (preview no WhatsApp, Google).
// No Netlify a env URL ja vem preenchida com o dominio do site; NEXT_PUBLIC_SITE_URL
// permite fixar um dominio proprio. O fallback so vale em dev.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "https://pharmacy-price.netlify.app";

const TITULO = "Pharmacy-price — o preço justo do seu remédio";
const DESCRICAO =
  "Compare o preço de medicamentos com o teto legal da Anvisa (CMED) e veja o que é de graça no Farmácia Popular. Piloto em Goiânia.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITULO, template: "%s · Pharmacy-price" },
  description: DESCRICAO,
  applicationName: "Pharmacy-price",
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    siteName: "Pharmacy-price",
    locale: "pt_BR",
    type: "website",
    url: "/",
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRICAO },
};

// Aplica o tema antes do primeiro paint (evita flash). Comeca no claro; respeita a escolha salva.
// Tambem escreve a meta theme-color (cor da barra do navegador no celular) a partir do tema
// resolvido — precisa seguir o app, nao o prefers-color-scheme do SO, senao a barra fica
// escura numa pagina clara (ou vice-versa). O ThemeToggle atualiza a mesma meta ao alternar.
// As cores batem com --bg de cada tema no globals.css. Conteudo constante, sem dado de usuario.
const themeScript = `try{var t=localStorage.getItem('pp:theme');var s=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var r=(t==='dark'||t==='light')?t:(t==='system'?s:'light');document.documentElement.dataset.theme=r;var m=document.querySelector('meta[name=theme-color]');if(!m){m=document.createElement('meta');m.name='theme-color';document.head.appendChild(m);}m.setAttribute('content',r==='dark'?'#0a1120':'#f5f8f9');}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="light" className={sora.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
