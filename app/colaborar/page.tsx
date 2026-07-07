import type { Metadata } from "next";
import Link from "next/link";
import { Colaborar } from "@/components/Colaborar";

export const metadata: Metadata = {
  title: "Vi um preço · Pharmacy-price",
  description:
    "Pagou caro no balcão em Goiânia? Reporte o preço, veja na hora se passou do teto legal e ajude a mapear as farmácias.",
};

export default function ColaborarPage() {
  return (
    <main className="page">
      <header className="hero hero-sub">
        <Link href="/" className="voltar">
          ← voltar
        </Link>
        <span className="badge-pill">Colabore · Goiânia</span>
        <h1 className="title">
          Pagou <em>caro</em> no balcão?
        </h1>
        <p className="lede">
          Em Goiás não existe portal público de preço de balcão. Quem constrói esse mapa é{" "}
          <strong>você</strong>: diga o que pagou, veja na hora se passou do <strong>teto legal</strong> e
          ajude a próxima pessoa a não ser lesada.
        </p>
      </header>

      <Colaborar />

      <footer className="foot">
        A comparação usa o teto CMED/Anvisa com ICMS de 19% de Goiás. Um relato não prova nada sozinho —
        vira dado quando várias pessoas confirmam. Projeto de portfólio, sem fins comerciais.
      </footer>
    </main>
  );
}
