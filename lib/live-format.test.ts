import { test } from "node:test";
import assert from "node:assert/strict";
import { haQuantoTempo } from "./med-format";
import { mapsBusca } from "./maps";

const DIA = 24 * 60 * 60 * 1000;

test("haQuantoTempo: agora -> hoje", () => {
  assert.equal(haQuantoTempo(new Date().toISOString()), "hoje");
});

test("haQuantoTempo: ~26h atras -> há 1 dia", () => {
  assert.equal(haQuantoTempo(new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString()), "há 1 dia");
});

test("haQuantoTempo: 5 dias atras -> há 5 dias", () => {
  assert.equal(haQuantoTempo(new Date(Date.now() - 5 * DIA).toISOString()), "há 5 dias");
});

test("haQuantoTempo: nulo ou invalido -> vazio", () => {
  assert.equal(haQuantoTempo(null), "");
  assert.equal(haQuantoTempo("nao-e-data"), "");
});

test("mapsBusca: monta a busca por texto, encodada", () => {
  const url = mapsBusca("Farmácia Pague Menos, Cabral");
  assert.ok(url.startsWith("https://www.google.com/maps/search/?api=1&query="));
  assert.ok(url.includes("Pague%20Menos"));
  assert.ok(!url.includes(" "));
});
