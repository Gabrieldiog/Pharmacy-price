import type { Metadata } from "next";
import Link from "next/link";
import { PanoramaView } from "@/components/PanoramaView";

export const metadata: Metadata = {
  title: "Panorama · Pharmacy-price",
  description: "O remédio no Brasil em números: teto legal, gratuidade e o quanto dá pra economizar.",
};

export default function PanoramaPage() {
  return (
    <main className="page">
      <header className="hero hero-sub">
        <Link href="/" className="voltar">
          ← voltar
        </Link>
        <span className="badge-pill">Panorama</span>
        <h1 className="title">O remédio em números</h1>
        <p className="lede">
          Alguns números que aparecem quando você junta o teto legal da Anvisa, a lista do Farmácia Popular e
          os preços reais das redes numa base só.
        </p>
      </header>

      <PanoramaView />

      <footer className="foot">
        Teto: CMED/Anvisa (jun/2026), ICMS de 19% de Goiás. De graça: Farmácia Popular de jun/2026. Preço das
        redes: coleta própria. Projeto de portfólio, sem fins comerciais.
        <br />
        <Link href="/metodologia" className="foot-link">
          Como calculamos isso — fontes e metodologia →
        </Link>
      </footer>
    </main>
  );
}
