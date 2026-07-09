import { test } from "node:test";
import assert from "node:assert/strict";
import { ondeComprar } from "./onde-comprar";
import type { LojaMeta } from "./types";

const PAGUE_MENOS: LojaMeta[] = [
  { bairro: "Setor Bueno", endereco: "Avenida T, 63", lat: -16.71, lng: -49.26 },
  { bairro: "Setor Bela Vista", endereco: "Couto Magalhaes, 5", lat: -16.68, lng: -49.25 },
];

test("rede com endereco: lista as lojas com mapa por coordenada", () => {
  const oc = ondeComprar("Pague Menos", "Goiânia", PAGUE_MENOS);
  assert.equal(oc.temEndereco, true);
  assert.equal(oc.lojas.length, 2);
  assert.equal(oc.lojas[0]!.rotulo, "Setor Bueno · Avenida T, 63");
  assert.match(oc.lojas[0]!.mapa, /query=-16\.71,-49\.26/);
});

test("rede sem endereco (Sao Joao, Drogal): nao some — entrega link de busca da rede", () => {
  const oc = ondeComprar("São João", "Goiânia", []);
  assert.equal(oc.temEndereco, false);
  assert.equal(oc.lojas.length, 0);
  assert.match(oc.buscaRede, /google\.com\/maps/);
  assert.match(decodeURIComponent(oc.buscaRede), /São João farmácia Goiânia/);
});

test("buscaRede existe mesmo quando ha endereco (fallback 'ver todas')", () => {
  const oc = ondeComprar("Pague Menos", "Goiânia", PAGUE_MENOS);
  assert.ok(oc.buscaRede.length > 0);
});

test("no maximo 3 lojas, e ignora coordenada invalida", () => {
  const muitas: LojaMeta[] = [
    ...PAGUE_MENOS,
    { bairro: "A", endereco: "rua 1", lat: -16.7, lng: -49.2 },
    { bairro: "B", endereco: "rua 2", lat: -16.7, lng: -49.2 },
    { bairro: "C", endereco: "rua 3", lat: Number.NaN, lng: -49.2 },
  ];
  const oc = ondeComprar("Pague Menos", "Goiânia", muitas);
  assert.equal(oc.lojas.length, 3);
});
