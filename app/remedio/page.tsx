import type { Metadata } from "next";
import { RedirecionaLegado } from "@/components/RedirecionaLegado";

// Compat: os links agora sao /remedio/<id>. Esta rota so existe pra redirecionar os
// links antigos (/remedio?id=<id>). noindex: e um stub de redirect, nao deve ser
// indexado como duplicata da home.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function RemedioLegacy() {
  return (
    <main className="page">
      <RedirecionaLegado />
    </main>
  );
}
