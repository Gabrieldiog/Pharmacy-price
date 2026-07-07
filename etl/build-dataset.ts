import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import type { Apresentacao } from "./types";
import { toAppMed, type AppMed } from "./enrich";
import { pmcParaUF } from "./aliquotas";

// Junta o teto (CMED) com o "de graca" (Farmacia Popular) num dataset unico pro app.
// Depende dos ETLs: rode `pnpm etl:cmed` e `pnpm etl:pfpb` antes (ou `pnpm data:all`).

interface PfpbLookup {
  mesReferencia: string;
  byEan: Record<string, { produto: string; indicacao: string }>;
}

function latestCmed(): string {
  const files = readdirSync("data").filter((f) => /^cmed-.*\.ndjson$/.test(f)).sort();
  const f = files.at(-1);
  if (!f) throw new Error("Nenhum data/cmed-*.ndjson encontrado. Rode `pnpm etl:cmed` primeiro.");
  return `data/${f}`;
}

function main() {
  const cmedPath = latestCmed();
  const pfpb = JSON.parse(readFileSync("data/pfpb-lookup.json", "utf8")) as PfpbLookup;
  const byEan = pfpb.byEan;

  const lines = readFileSync(cmedPath, "utf8").split("\n").filter(Boolean);
  const meds: AppMed[] = [];
  let deGracaCount = 0;
  let hospFiltrados = 0;
  let vigenciaCmed = "";

  for (const line of lines) {
    const a = JSON.parse(line) as Apresentacao;
    vigenciaCmed = a.vigencia;
    if ((a.restricao_hospitalar ?? "").toLowerCase().startsWith("sim")) {
      hospFiltrados++;
      continue; // fora do comparador de varejo
    }
    let indicacao: string | null = null;
    let deGraca = false;
    for (const e of a.eans) {
      const hit = byEan[e];
      if (hit) {
        deGraca = true;
        indicacao = hit.indicacao || null;
        break;
      }
    }
    if (deGraca) deGracaCount++;
    meds.push(toAppMed(a, deGraca, indicacao));
  }

  mkdirSync("data/app", { recursive: true });
  const ndjson = meds.map((m) => JSON.stringify(m)).join("\n") + "\n";
  writeFileSync("data/app/medicamentos.ndjson", ndjson);

  const grupos = new Set(meds.map((m) => m.grupo));
  const comTetoGO = meds.filter((m) => pmcParaUF(m.pmc, "GO") != null).length;
  const meta = {
    vigenciaCmed,
    vigenciaPfpb: pfpb.mesReferencia,
    total: meds.length,
    deGraca: deGracaCount,
    grupos: grupos.size,
    comTetoGO,
    hospitalaresFiltrados: hospFiltrados,
    bytes: ndjson.length,
    bytesGzip: gzipSync(ndjson).length,
  };
  writeFileSync("data/app/meta.json", JSON.stringify(meta, null, 2) + "\n");

  const sample = meds.filter((m) => (m.substancia ?? "").toUpperCase().includes("DIPIRONA")).slice(0, 6);
  writeFileSync("data/app/sample.ndjson", sample.map((m) => JSON.stringify(m)).join("\n") + "\n");

  console.log(JSON.stringify(meta, null, 2));
  console.log("\nAmostra 'de graca no Farmacia Popular':");
  for (const m of meds.filter((x) => x.deGraca).slice(0, 6)) {
    const t = pmcParaUF(m.pmc, "GO");
    const teto = t != null ? `teto GO R$ ${(t / 100).toFixed(2)}` : "sem teto GO";
    console.log(`  ${m.produto} | ${m.concentracao ?? "-"} | ${m.pfpbIndicacao ?? "-"} | ${teto}`);
  }
}

try {
  main();
} catch (e) {
  console.error("ERRO:", e instanceof Error ? e.message : e);
  process.exit(1);
}
