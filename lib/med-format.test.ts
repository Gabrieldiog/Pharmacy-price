import { test } from "node:test";
import assert from "node:assert/strict";
import { tipoLabel, tipoBadge, economiaVsTeto, tetoPelaLei, isControlado, exigeReceitaRetida } from "./med-format";

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

test("tetoPelaLei: rotula o teto como máximo da lei (nunca como preço)", () => {
  // tem teto e não é liberado -> "teto pela lei R$X"
  assert.equal(tetoPelaLei({ tetoGo: 44994, semTeto: false }), "teto pela lei R$ 449,94");
  // regime liberado -> não há teto legal, e isso é o contexto honesto
  assert.equal(tetoPelaLei({ tetoGo: null, semTeto: true }), "sem teto legal");
  assert.equal(tetoPelaLei({ tetoGo: 1000, semTeto: true }), "sem teto legal"); // liberado ganha do PMC
  // sem teto e sem regime liberado -> nada útil a mostrar
  assert.equal(tetoPelaLei({ tetoGo: null, semTeto: false }), null);
});

test("isControlado é só tarja preta (não vende online); exigeReceitaRetida é a vermelha restrita", () => {
  assert.equal(isControlado("Tarja Preta"), true);
  assert.equal(isControlado("Tarja Vermelha"), false);
  assert.equal(isControlado("Tarja Vermelha sob restrição"), false); // restrita não é preta
  assert.equal(exigeReceitaRetida("Tarja Vermelha sob restrição"), true);
  assert.equal(exigeReceitaRetida("Tarja Vermelha"), false);
  assert.equal(exigeReceitaRetida("Tarja Preta"), false);
  assert.equal(exigeReceitaRetida(null), false);
});
