import type { Metadata } from "next";
import { Suspense } from "react";
import { Remedio } from "@/components/Remedio";

export const metadata: Metadata = {
  title: "Detalhe do remédio · Pharmacy-price",
  description: "Preço praticado, teto legal e equivalentes na mesma dose.",
};

export default function RemedioPage() {
  return (
    <main className="page">
      <Suspense fallback={<p className="det-loading">Carregando…</p>}>
        <Remedio />
      </Suspense>
    </main>
  );
}
