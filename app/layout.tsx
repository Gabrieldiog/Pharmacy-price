import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

export const metadata: Metadata = {
  title: "Pharmacy-price — o preço justo do seu remédio",
  description:
    "Compare o preço de medicamentos com o teto legal da Anvisa (CMED) e veja o que é de graça no Farmácia Popular. Piloto em Goiânia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={sora.variable}>
      <body>{children}</body>
    </html>
  );
}
