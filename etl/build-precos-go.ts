import { writeFileSync, mkdirSync } from "node:fs";
import { REDES } from "./connectors/redes";
import { vtexSearchByTerm, vtexPickupPoints } from "./connectors/vtex";
import { upsertPreco, sortRedePrecos, type RedePreco } from "./precos";

// Coleta o preco praticado de varias redes VTEX (Pague Menos, Sao Joao, Drogal) para um
// conjunto de remedios comuns, e as lojas de cada rede em Goiania. Gera
// data/app/precos-goiania.json com, por EAN, a lista de precos por rede (ordenada).
// Preco NACIONAL da rede: o CEP so decide qual loja retira, nao o preco.
const TERMOS = [
  "losartana potassica 50mg", "dipirona 500mg", "metformina 850mg", "omeprazol 20mg",
  "amoxicilina 500mg", "paracetamol 750mg", "sinvastatina 20mg", "ibuprofeno 400mg",
  "atenolol 25mg", "hidroclorotiazida 25mg", "sinvastatina 40mg", "losartana 100mg",
];
const GOIANIA = { lat: -16.7145, lng: -49.2678 }; // Setor Bueno (regiao densa de farmacias)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface EanEntry {
  produto: string;
  marca: string | null;
  precos: RedePreco[];
}

async function main() {
  const byEan: Record<string, EanEntry> = {};
  const redesMeta: { nome: string; host: string; lojasCount: number; lojas: unknown[] }[] = [];

  for (const rede of REDES) {
    let vistos = 0;
    for (const termo of TERMOS) {
      const prods = await vtexSearchByTerm(rede.host, termo, 20);
      for (const p of prods) {
        if (!p.ean || p.precoCentavos == null || p.precoCentavos <= 0 || !p.disponivel) continue;
        const entry = (byEan[p.ean] ??= { produto: p.produto, marca: p.marca, precos: [] });
        if (!entry.produto) entry.produto = p.produto;
        entry.precos = upsertPreco(entry.precos, rede.nome, p.precoCentavos);
        vistos++;
      }
      await sleep(300); // rate limit gentil
    }

    const lojas = (await vtexPickupPoints(rede.host, GOIANIA.lat, GOIANIA.lng)).filter(
      (l) => (l.uf ?? "").toUpperCase() === "GO",
    );
    redesMeta.push({ nome: rede.nome, host: rede.host, lojasCount: lojas.length, lojas: lojas.slice(0, 6) });
    console.log(`  ${rede.nome}: ${vistos} precos coletados | ${lojas.length} lojas em Goiania`);
    await sleep(400);
  }

  for (const e of Object.values(byEan)) e.precos = sortRedePrecos(e.precos);

  const out = {
    tipo: "retirada" as const,
    cidade: "Goiânia",
    uf: "GO",
    observadoEm: new Date().toISOString(),
    redes: redesMeta,
    byEan,
  };
  mkdirSync("data/app", { recursive: true });
  writeFileSync("data/app/precos-goiania.json", JSON.stringify(out, null, 2) + "\n");

  const eansComparados = Object.values(byEan).filter((e) => e.precos.length > 1).length;
  console.log(`\n${Object.keys(byEan).length} EANs com preco | ${eansComparados} com 2+ redes pra comparar`);
}

main().catch((e) => {
  console.error("ERRO:", e instanceof Error ? e.message : e);
  process.exit(1);
});
