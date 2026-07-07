import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseCmedBuffer } from "./parse-cmed";
import { scrapeCmedLink, UA } from "./scrape-link";
import { pmcParaUF } from "./aliquotas";

// ETL da CMED: raspa o link vigente -> baixa o XLSX -> parseia -> normaliza -> NDJSON.
// Uso: `pnpm etl:cmed` (ao vivo) ou `pnpm etl:cmed -- --file caminho.xlsx --vigencia 2026-06` (offline).

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = arg("--file");
  let buf: Uint8Array;
  let vigencia: string;

  if (file) {
    buf = readFileSync(file);
    vigencia = arg("--vigencia") ?? "fixture";
    console.log(`Lendo arquivo local: ${file}`);
  } else {
    const link = await scrapeCmedLink();
    console.log(`Link CMED vigente: ${link.filename} (vigencia ${link.vigencia})`);
    const res = await fetch(link.url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`Download da CMED falhou: HTTP ${res.status}`);
    buf = new Uint8Array(await res.arrayBuffer());
    vigencia = link.vigencia;
    mkdirSync("data/_raw", { recursive: true });
    writeFileSync(`data/_raw/${link.filename}`, buf);
  }

  const sha = createHash("sha256").update(buf).digest("hex");
  console.log(`Arquivo: ${(buf.length / 1e6).toFixed(1)} MB | sha256 ${sha.slice(0, 12)}...`);

  const apres = parseCmedBuffer(buf, vigencia);
  console.log(`Parseado: ${apres.length} apresentacoes.`);

  mkdirSync("data", { recursive: true });
  const out = `data/cmed-${vigencia}.ndjson`;
  writeFileSync(out, apres.map((a) => JSON.stringify(a)).join("\n") + "\n");

  // amostra versionada no repo (dipirona) para demo/inspecao
  const dipirona = apres.filter((a) => (a.substancia ?? "").toUpperCase().includes("DIPIRONA"));
  writeFileSync(
    "data/sample-cmed-go.ndjson",
    dipirona.slice(0, 12).map((a) => JSON.stringify(a)).join("\n") + "\n",
  );

  const comGO = apres.filter((a) => a.pmc["19"] != null).length;
  console.log(`Escrito ${out} | com teto GO (19%): ${comGO}/${apres.length}`);
  console.log("\nAmostra — Dipirona (teto Goiania, ICMS 19%):");
  for (const a of dipirona.slice(0, 6)) {
    const t = pmcParaUF(a.pmc, "GO");
    const teto = t != null ? `R$ ${(t / 100).toFixed(2)}` : "—";
    console.log(`  ${a.produto ?? "?"} | ${(a.apresentacao ?? "").slice(0, 38)} | EAN ${a.eans[0] ?? "-"} | teto GO ${teto}`);
  }
}

main().catch((e) => {
  console.error("ERRO:", e instanceof Error ? e.message : e);
  process.exit(1);
});
