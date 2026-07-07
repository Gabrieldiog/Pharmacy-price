import Link from "next/link";
import { Search } from "@/components/Search";
import { Destaques } from "@/components/Destaques";

export default function Home() {
  return (
    <main className="page">
      <header className="hero">
        <span className="badge-pill">Piloto: Goiânia · GO</span>
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
        <br />
        <Link href="/metodologia" className="foot-link">
          Como calculamos isso — fontes e metodologia →
        </Link>
      </footer>
    </main>
  );
}
