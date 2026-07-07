import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCmedBuffer } from "./parse-cmed";
import { pmcParaUF } from "./aliquotas";

const buf = readFileSync(new URL("./__fixtures__/cmed-mini.xlsx", import.meta.url));

test("acha o cabecalho depois do preambulo e le as 2 apresentacoes", () => {
  const a = parseCmedBuffer(buf, "2026-06");
  assert.equal(a.length, 2);
});

test("preco com virgula vira centavos e a coluna 19% e o teto de GO", () => {
  const dip = parseCmedBuffer(buf, "2026-06").find((x) => (x.substancia ?? "").includes("DIPIRONA"));
  assert.ok(dip);
  assert.equal(dip.pmc["19"], 1234); // "12,34"
  assert.equal(dip.pmc["0"], 1050); // "10,50"
  assert.equal(pmcParaUF(dip.pmc, "GO"), 1234);
});

test("ignora a coluna ALC e trata '    -     ' como null", () => {
  const a = parseCmedBuffer(buf, "2026-06");
  const dip = a.find((x) => (x.substancia ?? "").includes("DIPIRONA"))!;
  assert.deepEqual(Object.keys(dip.pmc).sort(), ["0", "12", "17", "19"]); // sem "19 ALC"
  const los = a.find((x) => (x.substancia ?? "").includes("LOSARTANA"))!;
  assert.equal(los.pmc["12"], null); // veio "    -     "
  assert.equal(los.regime, "Liberado"); // sem teto
});

test("EAN vira string so-digitos e ignora vazio/'-'", () => {
  const dip = parseCmedBuffer(buf, "2026-06").find((x) => (x.substancia ?? "").includes("DIPIRONA"))!;
  assert.deepEqual(dip.eans, ["7891234567890"]);
});
