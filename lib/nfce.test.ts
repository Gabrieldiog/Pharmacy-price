import { test } from "node:test";
import assert from "node:assert/strict";
import { mod11ChaveDv, decodeChaveNfce, parseNfceInput, formatCnpj } from "./nfce";

// Chaves de Goias (cUF 52) modelo NFC-e (65), com DV calculado a mao.
// prefixo (43) = 52 2407 00000000000000 65 001 000000001 1 00000001
const PREFIXO_1 = "5224070000000000000065001000000001100000001";
const CHAVE_GO = PREFIXO_1 + "0"; // DV = 0
const PREFIXO_2 = "5224070000000000000065001000000009100000001";
const CHAVE_GO_2 = PREFIXO_2 + "9"; // DV = 9

test("mod11ChaveDv: digito verificador calculado a mao", () => {
  assert.equal(mod11ChaveDv(PREFIXO_1), 0);
  assert.equal(mod11ChaveDv(PREFIXO_2), 9);
});

test("decodeChaveNfce: chave valida de Goias", () => {
  const c = decodeChaveNfce(CHAVE_GO);
  assert.ok(c);
  assert.equal(c.valido, true);
  assert.equal(c.dvOk, true);
  assert.equal(c.isGoias, true);
  assert.equal(c.isNfce, true);
  assert.equal(c.uf, "GO");
  assert.equal(c.ano, 2024);
  assert.equal(c.mes, 7);
  assert.equal(c.cnpj, "00000000000000");
});

test("decodeChaveNfce: DV errado invalida a nota", () => {
  const c = decodeChaveNfce(PREFIXO_1 + "1"); // DV correto seria 0
  assert.ok(c);
  assert.equal(c.valido, false);
});

test("decodeChaveNfce: tamanho errado retorna null", () => {
  assert.equal(decodeChaveNfce("52240700"), null);
  assert.equal(decodeChaveNfce(""), null);
});

test("decodeChaveNfce: flags de UF e modelo fora de Goias", () => {
  // troca cUF -> 35 (SP) e modelo -> 55 (NFe) na mesma chave
  const outra = "35" + CHAVE_GO.slice(2, 20) + "55" + CHAVE_GO.slice(22);
  const c = decodeChaveNfce(outra);
  assert.ok(c);
  assert.equal(c.isGoias, false);
  assert.equal(c.isNfce, false);
  assert.equal(c.uf, "SP");
});

test("parseNfceInput: extrai a chave do link do QR", () => {
  const link = `http://nfe.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe?p=${CHAVE_GO}|2|1|1|A1B2C3`;
  assert.equal(parseNfceInput(link), CHAVE_GO);
});

test("parseNfceInput: aceita chave crua com espacos", () => {
  const comEspacos = CHAVE_GO.replace(/(.{4})/g, "$1 ").trim();
  assert.equal(parseNfceInput(comEspacos), CHAVE_GO);
  assert.equal(parseNfceInput(CHAVE_GO_2), CHAVE_GO_2);
});

test("parseNfceInput: lixo retorna null", () => {
  assert.equal(parseNfceInput("nao e uma nota"), null);
  assert.equal(parseNfceInput(""), null);
});

test("formatCnpj: mascara padrao", () => {
  assert.equal(formatCnpj("11222333000181"), "11.222.333/0001-81");
});
