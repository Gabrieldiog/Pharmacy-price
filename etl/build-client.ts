import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import type { AppMed } from "./enrich";
import { pmcParaUF } from "./aliquotas";
import { upsertPreco, sortRedePrecos, type RedePreco } from "./precos";

// Gera o dataset enxuto do cliente (piloto Goiania): campos da UI + teto de GO + precos
// praticados das redes VTEX (ordenados do mais barato). Depende de build:data e build:precos-go.
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
  precos: RedePreco[]; // precos por rede, ordenados asc (o menor primeiro)
}

interface PrecosGoiania {
  cidade: string;
  uf: string;
  tipo: string;
  observadoEm: string;
  redes: { nome: string; lojasCount: number }[];
  byEan: Record<string, { precos: RedePreco[] }>;
}

const precos = JSON.parse(readFileSync("data/app/precos-goiania.json", "utf8")) as PrecosGoiania;
const precoByEan = precos.byEan;

const lines = readFileSync("data/app/medicamentos.ndjson", "utf8").split("\n").filter(Boolean);
const out: ClientMed[] = lines.map((l) => {
  const m = JSON.parse(l) as AppMed;
  // um medicamento pode ter varios EANs; junta os precos de todas as redes que baterem
  let redePrecos: RedePreco[] = [];
  for (const e of m.eans) {
    const hit = precoByEan[e];
    if (hit) for (const rp of hit.precos) redePrecos = upsertPreco(redePrecos, rp.rede, rp.centavos);
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
    precos: sortRedePrecos(redePrecos),
  };
});

mkdirSync("public", { recursive: true });
const json = JSON.stringify(out);
writeFileSync("public/medicamentos-go.json", json);
writeFileSync(
  "public/precos-meta.json",
  JSON.stringify({
    cidade: precos.cidade,
    uf: precos.uf,
    tipo: precos.tipo,
    observadoEm: precos.observadoEm,
    redes: precos.redes.map((r) => ({ nome: r.nome, lojasCount: r.lojasCount })),
  }),
);

const comPreco = out.filter((m) => m.precos.length > 0).length;
const comparaveis = out.filter((m) => m.precos.length > 1).length;
console.log(
  `public/medicamentos-go.json: ${out.length} itens | ${(json.length / 1e6).toFixed(1)} MB | ${(gzipSync(json).length / 1e6).toFixed(2)} MB gzip | ${comPreco} com preco (${comparaveis} comparaveis em 2+ redes)`,
);
