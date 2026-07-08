import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import type { AppMed } from "./enrich";
import { grupoKey } from "./enrich";
import { pmcParaUF } from "./aliquotas";
import { computeDestaques } from "./destaques";
import { computePanorama } from "./panorama";
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
  grupo: string | null; // chave de equivalencia (substancia|concentracao); null se faltar um dos dois
}

interface LojaColeta {
  nome: string;
  endereco: string;
  bairro: string | null;
  lat: number | null;
  lng: number | null;
}
interface PrecosGoiania {
  cidade: string;
  uf: string;
  tipo: string;
  observadoEm: string;
  redes: { nome: string; lojasCount: number; lojas?: LojaColeta[] }[];
  byEan: Record<string, { precos: RedePreco[] }>;
}

// Na build de produção (ex.: Netlify) os dados brutos da ETL não vêm no repo —
// mas os JSONs finais estão commitados em public/. Se é esse o caso, não há o que
// regerar: usa o que já está lá e sai limpo, em vez de quebrar o build.
if (!existsSync("data/app/medicamentos.ndjson") && existsSync("public/medicamentos-go.json")) {
  console.log("[build-client] dados brutos ausentes; usando os JSONs já commitados em public/");
  process.exit(0);
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
    // recalcula a chave de equivalencia dos campos crus (grupoKey atualizado, sem re-rodar build:data)
    grupo: m.substancia && m.concentracao ? grupoKey(m.substancia, m.concentracao) : null,
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
    redes: precos.redes.map((r) => ({
      nome: r.nome,
      lojasCount: r.lojasCount,
      // lojas com coordenada, pro "ver no mapa" (link Google Maps, sem embutir mapa)
      lojas: (r.lojas ?? [])
        .filter((l) => l.lat != null && l.lng != null)
        .slice(0, 6)
        .map((l) => ({ bairro: l.bairro, endereco: l.endereco, lat: l.lat, lng: l.lng })),
    })),
  }),
);

// destaques da home (economia, de graca, acima do teto) — precomputados pra mostrar valor na hora
const destaques = computeDestaques(out);
writeFileSync("public/destaques.json", JSON.stringify(destaques));

// panorama: numeros agregados do dataset + cobertura das redes coletadas
const panorama = {
  ...computePanorama(out),
  redesCount: precos.redes.length,
  lojas: precos.redes.reduce((s, r) => s + r.lojasCount, 0),
  cidade: precos.cidade,
  observadoEm: precos.observadoEm,
};
writeFileSync("public/panorama.json", JSON.stringify(panorama));

const comPreco = out.filter((m) => m.precos.length > 0).length;
const comparaveis = out.filter((m) => m.precos.length > 1).length;
console.log(
  `public/medicamentos-go.json: ${out.length} itens | ${(json.length / 1e6).toFixed(1)} MB | ${(gzipSync(json).length / 1e6).toFixed(2)} MB gzip | ${comPreco} com preco (${comparaveis} comparaveis em 2+ redes)`,
);
console.log(
  `public/destaques.json: ${destaques.economia.length} economia | ${destaques.gratis.length} de graca | ${destaques.acimaDoTeto.length} acima do teto`,
);
