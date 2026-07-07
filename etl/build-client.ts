import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import type { AppMed } from "./enrich";
import { pmcParaUF } from "./aliquotas";

// Gera o dataset enxuto do cliente (piloto Goiania): campos da UI + teto de GO + preco
// praticado (Pague Menos) quando houver. Depende de build:data e build:precos-go.
interface ClientMed {
  id: string;
  produto: string;
  substancia: string | null;
  concentracao: string | null;
  apresentacao: string | null;
  laboratorio: string | null;
  tipo: string | null;
  tarja: string | null;
  deGraca: boolean;
  indicacao: string | null;
  semTeto: boolean;
  tetoGo: number | null;
  precoRede: number | null; // preco praticado da rede piloto, em centavos
}

interface PrecosGoiania {
  rede: string;
  cidade: string;
  uf: string;
  tipo: string;
  observadoEm: string;
  lojasCount: number;
  byEan: Record<string, { precoCentavos: number }>;
}

const precos = JSON.parse(readFileSync("data/app/precos-goiania.json", "utf8")) as PrecosGoiania;
const precoByEan = precos.byEan;

const lines = readFileSync("data/app/medicamentos.ndjson", "utf8").split("\n").filter(Boolean);
const out: ClientMed[] = lines.map((l) => {
  const m = JSON.parse(l) as AppMed;
  let precoRede: number | null = null;
  for (const e of m.eans) {
    const p = precoByEan[e];
    if (p) { precoRede = p.precoCentavos; break; }
  }
  return {
    id: m.id,
    produto: m.produto,
    substancia: m.substancia,
    concentracao: m.concentracao,
    apresentacao: m.apresentacao,
    laboratorio: m.laboratorio,
    tipo: m.tipo,
    tarja: m.tarja,
    deGraca: m.deGraca,
    indicacao: m.pfpbIndicacao,
    semTeto: m.semTeto,
    tetoGo: pmcParaUF(m.pmc, "GO"),
    precoRede,
  };
});

mkdirSync("public", { recursive: true });
const json = JSON.stringify(out);
writeFileSync("public/medicamentos-go.json", json);
writeFileSync(
  "public/precos-meta.json",
  JSON.stringify({
    rede: precos.rede,
    cidade: precos.cidade,
    uf: precos.uf,
    tipo: precos.tipo,
    observadoEm: precos.observadoEm,
    lojasCount: precos.lojasCount,
  }),
);

const comPreco = out.filter((m) => m.precoRede != null).length;
console.log(
  `public/medicamentos-go.json: ${out.length} itens | ${(json.length / 1e6).toFixed(1)} MB | ${(gzipSync(json).length / 1e6).toFixed(2)} MB gzip | ${comPreco} com preco ${precos.rede}`,
);
