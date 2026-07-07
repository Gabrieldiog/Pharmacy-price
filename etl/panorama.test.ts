import { test } from "node:test";
import assert from "node:assert/strict";
import { computePanorama, type PanoramaMedInput } from "./panorama";

function med(p: Partial<PanoramaMedInput> & { id: string }): PanoramaMedInput {
  return { produto: p.id, deGraca: false, indicacao: null, semTeto: false, tetoGo: null, precos: [], grupo: null, ...p };
}

test("computePanorama: conta cobertura", () => {
  const meds = [
    med({ id: "a", tetoGo: 1000, precos: [{ rede: "X", centavos: 500 }] }),
    med({ id: "b", tetoGo: 2000 }),
    med({ id: "c", deGraca: true, tetoGo: 3000, indicacao: "HIPERTENSÃO" }),
    med({ id: "d", semTeto: true }),
  ];
  const p = computePanorama(meds);
  assert.equal(p.totalMeds, 4);
  assert.equal(p.comTeto, 3); // a, b, c (d e semTeto)
  assert.equal(p.comPreco, 1); // a
  assert.equal(p.deGraca, 1); // c
});

test("computePanorama: media abaixo do teto", () => {
  const meds = [
    med({ id: "a", tetoGo: 1000, precos: [{ rede: "X", centavos: 500 }] }), // 50% abaixo
    med({ id: "b", tetoGo: 1000, precos: [{ rede: "X", centavos: 700 }] }), // 30% abaixo
  ];
  assert.equal(computePanorama(meds).economiaMediaPct, 40); // media de 50 e 30
});

test("computePanorama: top indicacoes e o de graca mais caro", () => {
  const meds = [
    med({ id: "a", deGraca: true, indicacao: "HIPERTENSÃO", tetoGo: 1000 }),
    med({ id: "b", deGraca: true, indicacao: "HIPERTENSÃO", tetoGo: 5000 }),
    med({ id: "c", deGraca: true, indicacao: "DIABETES", tetoGo: 2000 }),
  ];
  const p = computePanorama(meds);
  assert.equal(p.gratisTopIndicacoes[0]?.indicacao, "HIPERTENSÃO");
  assert.equal(p.gratisTopIndicacoes[0]?.count, 2);
  assert.equal(p.gratisMaisCaro?.id, "b"); // maior teto entre os de graca
  assert.equal(p.gratisMaisCaro?.cents, 5000);
});

test("computePanorama: descarta outlier de PMC no 'de graca mais caro'", () => {
  // grupo com pares ~R$30 e uma linha absurda a R$450 (outlier da CMED)
  const grupo = "sinvastatina|40mg";
  const meds = [
    med({ id: "out", produto: "SINV OUT", deGraca: true, grupo, tetoGo: 45000 }), // outlier
    med({ id: "n1", grupo, tetoGo: 3000 }),
    med({ id: "n2", grupo, tetoGo: 3200 }),
    med({ id: "n3", grupo, tetoGo: 2800 }),
    med({ id: "real", produto: "FORXIGA", deGraca: true, grupo: "dapagliflozina|10mg", tetoGo: 24000 }),
  ];
  const p = computePanorama(meds);
  assert.equal(p.gratisMaisCaro?.id, "real"); // o outlier a R$450 foi descartado
});
