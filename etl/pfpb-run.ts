import { writeFileSync, mkdirSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import { scrapePfpbMedicamentosLink } from "./scrape-pfpb";
import { parsePfpbText } from "./parse-pfpb";
import { UA } from "./scrape-link";

// ETL do Farmacia Popular: raspa o PDF mensal -> extrai texto -> parseia -> NDJSON + lookup por EAN.
// O lookup por EAN alimenta o badge "de graca no Farmacia Popular".
async function main() {
  const link = await scrapePfpbMedicamentosLink();
  console.log(`Lista PFPB vigente: ${link.mesReferencia}`);
  console.log(`PDF: ${link.url}`);

  const res = await fetch(link.url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Download do PDF falhou: HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const pdf = await getDocumentProxy(buf);
  const { text } = await extractText(pdf, { mergePages: true });

  const items = parsePfpbText(text, link.mesReferencia);
  const invalidos = items.filter((i) => !i.eanValido).length;
  const indicacoes = [...new Set(items.map((i) => i.indicacao).filter(Boolean))];
  console.log(`Itens: ${items.length} | EANs com check digit invalido: ${invalidos} | indicacoes: ${indicacoes.length}`);

  mkdirSync("data", { recursive: true });
  writeFileSync(
    `data/farmacia-popular-${link.mesReferencia}.ndjson`,
    items.map((i) => JSON.stringify(i)).join("\n") + "\n",
  );

  // asset do app: lookup por EAN para o badge "de graca no Farmacia Popular"
  const byEan: Record<string, { produto: string; indicacao: string }> = {};
  for (const i of items) byEan[i.ean] = { produto: i.produto, indicacao: i.indicacao };
  writeFileSync(
    "data/pfpb-lookup.json",
    JSON.stringify({ mesReferencia: link.mesReferencia, total: items.length, byEan }) + "\n",
  );

  console.log(`\nIndicacoes: ${indicacoes.join(", ")}`);
  console.log("\nAmostra:");
  for (const i of items.slice(0, 6)) {
    console.log(`  ${i.produto} | ${i.indicacao} | ${i.ean}${i.eanValido ? "" : " (check digit invalido)"}`);
  }
}

main().catch((e) => {
  console.error("ERRO:", e instanceof Error ? e.message : e);
  process.exit(1);
});
