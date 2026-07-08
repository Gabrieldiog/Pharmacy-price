import { test } from "node:test";
import assert from "node:assert/strict";
import { tipoLabel, tipoBadge, economiaVsTeto } from "./med-format";

test("tipoLabel: 'novo' vira 'De marca', nunca 'Referência'", () => {
  assert.equal(tipoLabel("Novo"), "De marca");
  assert.equal(tipoLabel("GENERICO"), "Genérico");
  assert.equal(tipoLabel("Similar"), "Similar");
  assert.equal(tipoLabel(null), null);
});

test("tipoBadge: cada tipo tem sigla, rótulo e classe", () => {
  assert.equal(tipoBadge("Genérico")?.sigla, "G");
  assert.equal(tipoBadge("Genérico")?.label, "Genérico");
  assert.equal(tipoBadge("similar")?.cls, "tb-similar");
  assert.equal(tipoBadge("novo")?.label, "De marca");
  assert.equal(tipoBadge("xyz"), null);
});

test("economiaVsTeto: percentual e reais quando o preço está abaixo do teto", () => {
  const e = economiaVsTeto(2484, 11354);
  assert.ok(e);
  assert.equal(e.pct, 78);
  assert.equal(e.reais, "R$ 88,70");
});

test("economiaVsTeto: null quando não há economia ou teto inválido", () => {
  assert.equal(economiaVsTeto(1000, 1000), null); // igual ao teto
  assert.equal(economiaVsTeto(2000, 1000), null); // acima do teto
  assert.equal(economiaVsTeto(500, 0), null); // teto inválido
});
