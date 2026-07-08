import Link from "next/link";
import { Search } from "@/components/Search";
import { Destaques } from "@/components/Destaques";
import { Regiao } from "@/components/Regiao";

export default function Home() {
  return (
    <main className="page">
      <header className="hero">
        <Regiao />
        <h1 className="title">
          Quanto <em>deveria</em> custar o seu remédio?
        </h1>
        <p className="lede">
          Compare com o <strong>teto legal</strong> da Anvisa e descubra o que é{" "}
          <strong>de graça</strong> no Farmácia Popular. Preço por lei, não por marketing.
        </p>
        <Search fallback={<Destaques />} />
        <Link href="/colaborar" className="cta-colab">
          Pagou caro no balcão? Ajude a mapear as farmácias de Goiânia →
        </Link>
      </header>

      <footer className="foot">
        Teto: CMED/Anvisa (lista de jun/2026), calculado com o ICMS de 19% de Goiás · De graça: lista do
        Farmácia Popular de jun/2026. Projeto de portfólio, sem fins comerciais — não substitui médico
        nem farmacêutico.
        <div className="foot-links">
          <Link href="/panorama" className="foot-link">
            O remédio em números →
          </Link>
          <Link href="/metodologia" className="foot-link">
            Fontes e metodologia →
          </Link>
        </div>
      </footer>
    </main>
  );
}
