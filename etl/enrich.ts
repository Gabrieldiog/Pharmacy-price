import type { Apresentacao } from "./types";

// Registro enxuto que vai pro cliente (o app carrega isso e indexa com MiniSearch).
export interface AppMed {
  id: string; // slug + ggrem (unico)
  slug: string;
  ggrem: string;
  ean: string | null;
  eans: string[];
  produto: string;
  substancia: string | null;
  laboratorio: string | null;
  apresentacao: string | null;
  concentracao: string | null;
  tipo: string | null;
  tarja: string | null;
  classe: string | null;
  grupo: string; // substancia|concentracao normalizados (equivalencia)
  semTeto: boolean; // regime "Liberado"
  deGraca: boolean;
  pfpbIndicacao: string | null;
  pmc: Record<string, number | null>; // teto por aliquota, em centavos
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

export function slugify(s: string): string {
  return semAcento(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

// Primeira dose da apresentacao: "500 MG", "50 MG", "100 MG/ML", "0,05 MG"...
export function extractConcentracao(apresentacao: string | null): string | null {
  if (!apresentacao) return null;
  const m = apresentacao.match(/\b\d+(?:[.,]\d+)?\s?(?:MG|MCG|G|UI|%)(?:\s?\/\s?ML)?\b/i);
  return m ? m[0].replace(/\s+/g, " ").toUpperCase() : null;
}

// Chave de equivalencia: mesmo principio ativo + mesma concentracao.
// Normaliza forte (tira acento, caixa, espacos e pontuacao) pra nao fragmentar grupos por
// grafia: "tri-hidratada" e "trihidratada", "axetil cefuroxima" e "axetilcefuroxima",
// "ibuprofeno;arginina" e "ibuprofeno arginina" caem na mesma chave.
export function grupoKey(substancia: string | null, concentracao: string | null): string {
  const s = semAcento(substancia ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const c = (concentracao ?? "").toLowerCase().replace(/,/g, ".").replace(/[^a-z0-9.]/g, "");
  return `${s}|${c}`;
}

export function toAppMed(a: Apresentacao, deGraca: boolean, pfpbIndicacao: string | null): AppMed {
  const concentracao = extractConcentracao(a.apresentacao);
  const slug = slugify(`${a.produto ?? a.substancia ?? "medicamento"} ${concentracao ?? ""}`);
  return {
    id: `${slug}-${a.ggrem ?? ""}`.replace(/-+$/g, ""),
    slug,
    ggrem: a.ggrem ?? "",
    ean: a.eans[0] ?? null,
    eans: a.eans,
    produto: a.produto ?? "",
    substancia: a.substancia,
    laboratorio: a.laboratorio,
    apresentacao: a.apresentacao,
    concentracao,
    tipo: a.tipo,
    tarja: a.tarja,
    classe: a.classe_terapeutica,
    grupo: grupoKey(a.substancia, concentracao),
    semTeto: (a.regime ?? "").toLowerCase().includes("liberado"),
    deGraca,
    pfpbIndicacao,
    pmc: a.pmc,
  };
}
