import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

export const metadata: Metadata = {
  title: "Pharmacy-price — o preço justo do seu remédio",
  description:
    "Compare o preço de medicamentos com o teto legal da Anvisa (CMED) e veja o que é de graça no Farmácia Popular. Piloto em Goiânia.",
};

// Aplica o tema antes do primeiro paint (evita flash). Comeca no claro; respeita a escolha salva.
// Conteudo constante, sem dado de usuario.
const themeScript = `try{var t=localStorage.getItem('pp:theme');var s=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=(t==='dark'||t==='light')?t:(t==='system'?s:'light');}catch(e){}`;

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
