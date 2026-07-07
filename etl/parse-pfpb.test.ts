import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePfpbText } from "./parse-pfpb";
import { isValidEan13 } from "./ean";

const TEXT =
  "Página 1 de 2 PRODUTO INDICAÇÃO CÓDIGO DE BARRAS " +
  "LOSARTANA POTÁSSICA 50MG HIPERTENSÃO 7891234567895 " +
  "CLORIDRATO DE METFORMINA 850MG DIABETES 7890000000000 " +
  "DAPAGLIFLOZINA 10MG DIABETES MELLITUS + DOENÇA CARDIOVASCULAR 7896112403036";

test("valida o check digit do EAN-13", () => {
  assert.equal(isValidEan13("7891234567895"), true);
  assert.equal(isValidEan13("7891234567890"), false); // check digit errado
  assert.equal(isValidEan13("123"), false);
});

test("parseia PRODUTO/INDICACAO/EAN e descarta o cabecalho", () => {
  const items = parsePfpbText(TEXT, "2026-06");
  assert.equal(items.length, 3);
  const los = items[0]!;
  assert.equal(los.ean, "7891234567895");
  assert.equal(los.indicacao, "HIPERTENSÃO");
  assert.match(los.produto, /^LOSARTANA POT[ÁA]SSICA 50MG$/);
  assert.equal(los.eanValido, true);
  assert.ok(!los.produto.includes("PRODUTO"));
  assert.ok(!los.produto.includes("Página"));
});

test("pega a indicacao mais longa (Diabetes + DCV, nao so Diabetes)", () => {
  const items = parsePfpbText(TEXT, "2026-06");
  const dapa = items.find((i) => i.produto.includes("DAPAGLIFLOZINA"))!;
  assert.equal(dapa.indicacao, "DIABETES MELLITUS + DOENÇA CARDIOVASCULAR");
  assert.equal(dapa.produto, "DAPAGLIFLOZINA 10MG");
});
