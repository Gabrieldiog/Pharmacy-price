import type { Metadata } from "next";
import type { ClientMed } from "@/lib/types";
import { Remedio } from "@/components/Remedio";
import { medPorId, todosOsMeds } from "@/lib/meds-build";
import { brl, isControlado } from "@/lib/med-format";

// Cada remedio vira uma URL propria e estatica (/remedio/<id>) — o que torna a
// pagina compartilhavel com preview rico e indexavel pelo Google. Antes era
// /remedio?id=, que os crawlers nao leem (o id so existe no cliente).
export const dynamicParams = false;

export async function generateStaticParams() {
  const meds = await todosOsMeds();
  // LIMIT_MEDS: knob so de dev pra iterar rapido (o build completo sao ~21k paginas).
  // Sem a env, gera tudo — que e o que roda no deploy.
  const lim = process.env.LIMIT_MEDS ? Number(process.env.LIMIT_MEDS) : 0;
  return (lim > 0 ? meds.slice(0, lim) : meds).map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const med = await medPorId(id);
  if (!med) return { title: "Remédio não encontrado · Pharmacy-price" };

  const dose = med.concentracao ? ` ${med.concentracao}` : "";
  const title = `${med.produto}${dose} — preço e teto legal em Goiânia`;
  const description = descricaoMed(med);
  const url = `/remedio/${med.id}`;
  // a imagem OG precisa ser referenciada aqui: ao definir seu proprio openGraph, a
  // rota filha perde a imagem que a convencao (opengraph-image.tsx) injeta na raiz.
  const imagem = { url: "/opengraph-image", width: 1200, height: 630, alt: "Pharmacy-price" };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article", images: [imagem] },
    twitter: { card: "summary_large_image", title, description, images: [imagem.url] },
  };
}

// Descricao pro preview: usa o mesmo criterio de preco do resto do app (controlado
// nao mostra preco praticado; de graca e teto tem prioridade de fala).
function descricaoMed(med: ClientMed): string {
  const r$ = (c: number) => brl(c) ?? "";
  const teto = med.tetoGo != null && !med.semTeto ? med.tetoGo : null;
  const preco = !isControlado(med.tarja) ? med.precos?.[0] ?? null : null;

  if (med.deGraca) {
    return `De graça pela Farmácia Popular.${teto ? ` Teto legal em GO ${r$(teto)}.` : ""} Veja onde retirar e os equivalentes na mesma dose.`;
  }
  if (isControlado(med.tarja)) {
    return `Medicamento controlado (tarja preta) — vendido só no balcão, com receita.${teto ? ` Teto legal em GO ${r$(teto)}.` : ""}`;
  }
  if (preco) {
    return `A partir de ${r$(preco.centavos)} na ${preco.rede}, em Goiânia.${teto ? ` Teto legal ${r$(teto)}.` : ""} Compare com genéricos e equivalentes.`;
  }
  if (teto) {
    return `Teto legal em Goiás: ${r$(teto)} — o máximo que a lei permite cobrar. Veja equivalentes e o que é de graça na mesma dose.`;
  }
  return "Preço, teto legal e equivalentes na mesma dose.";
}

export default async function RemedioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="page">
      <Remedio id={id} />
    </main>
  );
}
