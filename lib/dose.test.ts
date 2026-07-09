import { test } from "node:test";
import assert from "node:assert/strict";
import { doseCanonica, filtraPorDose } from "./dose";

test("doseCanonica: campo concentracao da base", () => {
  assert.equal(doseCanonica("40 MG"), "40mg");
  assert.equal(doseCanonica("500 MG/ML"), "500mg/ml");
  assert.equal(doseCanonica("2,5 MG"), "2.5mg"); // virgula decimal -> ponto
  assert.equal(doseCanonica("1 G"), "1g");
});

test("doseCanonica: descricao livre de produto (pega a dose, ignora a quantidade)", () => {
  assert.equal(doseCanonica("Sinvastatina 40mg 30 Comprimidos - Genérico - Ems"), "40mg");
  assert.equal(doseCanonica("SINVASTATINA 20MG C/30 COMP SANDOZ"), "20mg");
  assert.equal(doseCanonica("Dipirona 500mg/ml Solução Oral 20ml"), "500mg/ml");
  assert.equal(doseCanonica("Amoxicilina 500 mg 21 cápsulas"), "500mg");
});

test("doseCanonica: /ml com espaço não vira mg de comprimido (base tem '5 MG / ML')", () => {
  assert.equal(doseCanonica("5 MG / ML"), "5mg/ml");
  assert.equal(doseCanonica("0,2 MG /ML"), "0.2mg/ml");
  assert.equal(doseCanonica("500 MG/ ML"), "500mg/ml");
  // não colide com o comprimido de mesma parte numérica
  assert.notEqual(doseCanonica("5 MG / ML"), doseCanonica("5 MG"));
});

test("doseCanonica: prefere a dose de massa quando o volume vem antes", () => {
  assert.equal(doseCanonica("Gotas 20ml Dipirona 500mg/ml"), "500mg/ml");
  assert.equal(doseCanonica("Frasco 100ml Amoxicilina 250 mg"), "250mg");
  // volume puro, sem massa: mantém o volume
  assert.equal(doseCanonica("Soro fisiológico 500ml"), "500ml");
});

test("doseCanonica: null quando não há dose reconhecível", () => {
  assert.equal(doseCanonica("30 Comprimidos"), null);
  assert.equal(doseCanonica(""), null);
  assert.equal(doseCanonica(null), null);
  assert.equal(doseCanonica(undefined), null);
});

// o caso real da sim1.png: página da sinvastatina 40mg, ao vivo veio 10/20/40mg
const AO_VIVO = [
  { descricao: "Sinvastatina 10mg 30 Comprimidos - Genérico - Ems", valorCents: 799 },
  { descricao: "Sinvastatina 20mg Genérico Cimed 30 Comprimidos", valorCents: 899 },
  { descricao: "Sinvastatina 40mg 30 Comprimidos Revestidos - Genérico - Ems", valorCents: 1286 },
];

test("filtraPorDose: página da 40mg mostra só os 40mg (o 10mg de R$7,99 não vira 'menor')", () => {
  const r = filtraPorDose(AO_VIVO, "40 MG");
  assert.equal(r.filtrando, true);
  assert.equal(r.dose, "40mg");
  assert.equal(r.itens.length, 1);
  assert.equal(r.itens[0]!.descricao.includes("40mg"), true);
  assert.equal(r.itens[0]!.valorCents, 1286); // o menor 40mg, não o 10mg
});

test("filtraPorDose: sem a mesma dose ao vivo -> mostra tudo, filtrando=false (não fica vazio)", () => {
  const r = filtraPorDose(AO_VIVO, "80 MG");
  assert.equal(r.filtrando, false);
  assert.equal(r.dose, "80mg"); // a dose foi identificada, só não bateu com nenhum
  assert.equal(r.itens.length, 3);
});

test("filtraPorDose: concentração desconhecida -> mostra tudo, dose null (ressalva some)", () => {
  const r = filtraPorDose(AO_VIVO, null);
  assert.equal(r.filtrando, false);
  assert.equal(r.dose, null);
  assert.equal(r.itens.length, 3);
});
