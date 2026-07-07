import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import type { AppMed } from "./enrich";
import { pmcParaUF } from "./aliquotas";

// Gera o dataset enxuto do cliente (piloto Goiania): so os campos que a UI usa + teto de GO.
// Depende de data/app/medicamentos.ndjson (rode `pnpm build:data` antes).
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
}

const lines = readFileSync("data/app/medicamentos.ndjson", "utf8").split("\n").filter(Boolean);
const out: ClientMed[] = lines.map((l) => {
  const m = JSON.parse(l) as AppMed;
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
  };
});

mkdirSync("public", { recursive: true });
const json = JSON.stringify(out);
writeFileSync("public/medicamentos-go.json", json);
console.log(
  `public/medicamentos-go.json: ${out.length} itens | ${(json.length / 1e6).toFixed(1)} MB | ${(gzipSync(json).length / 1e6).toFixed(2)} MB gzip`,
);
