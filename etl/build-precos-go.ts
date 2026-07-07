import { writeFileSync, mkdirSync } from "node:fs";
import { paguemenos } from "./connectors/paguemenos";
import { vtexSearchByTerm, vtexPickupPoints } from "./connectors/vtex";

// Coleta o preco praticado do Pague Menos (VTEX) para um conjunto de remedios comuns e
// as lojas de Goiania. Gera data/app/precos-goiania.json (tipo=retirada), com data da coleta.
// Preco NACIONAL da rede: o CEP so decide qual loja retira, nao o preco.
const TERMOS = [
  "losartana potassica 50mg", "dipirona 500mg", "metformina 850mg", "omeprazol 20mg",
  "amoxicilina 500mg", "paracetamol 750mg", "sinvastatina 20mg", "ibuprofeno 400mg",
  "atenolol 25mg", "hidroclorotiazida 25mg", "sinvastatina 40mg", "losartana 100mg",
];
const GOIANIA = { lat: -16.7145, lng: -49.2678 }; // Setor Bueno (regiao densa de farmacias)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const byEan: Record<string, { produto: string; marca: string | null; precoCentavos: number; disponivel: boolean }> = {};
  for (const termo of TERMOS) {
    const prods = await vtexSearchByTerm(paguemenos.host, termo, 20);
    for (const p of prods) {
      if (p.ean && p.precoCentavos != null) {
        byEan[p.ean] = { produto: p.produto, marca: p.marca, precoCentavos: p.precoCentavos, disponivel: p.disponivel };
      }
    }
    process.stdout.write(`  ${termo}: ${prods.length} produtos\n`);
    await sleep(400); // rate limit gentil
  }

  const lojas = (await vtexPickupPoints(paguemenos.host, GOIANIA.lat, GOIANIA.lng)).filter(
    (l) => (l.uf ?? "").toUpperCase() === "GO",
  );

  const out = {
    rede: paguemenos.nome,
    tipo: "retirada" as const,
    cidade: "Goiânia",
    uf: "GO",
    observadoEm: new Date().toISOString(),
    lojasCount: lojas.length,
    lojas: lojas.slice(0, 8),
    byEan,
  };
  mkdirSync("data/app", { recursive: true });
  writeFileSync("data/app/precos-goiania.json", JSON.stringify(out, null, 2) + "\n");

  console.log(`\nPague Menos: ${Object.keys(byEan).length} precos por EAN | ${lojas.length} lojas em Goiania`);
  console.log("Amostra:");
  for (const [ean, v] of Object.entries(byEan).slice(0, 8)) {
    console.log(`  ${v.produto} | R$ ${(v.precoCentavos / 100).toFixed(2)} | EAN ${ean}`);
  }
}

main().catch((e) => {
  console.error("ERRO:", e instanceof Error ? e.message : e);
  process.exit(1);
});
