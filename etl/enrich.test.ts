import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, extractConcentracao, grupoKey, toAppMed } from "./enrich";
import type { Apresentacao } from "./types";

test("slugify remove acentos e normaliza", () => {
  assert.equal(slugify("Dipirona Monoidratada 500MG"), "dipirona-monoidratada-500mg");
  assert.equal(slugify("  Losartana Potássica  "), "losartana-potassica");
});

test("extractConcentracao pega a primeira dose", () => {
  assert.equal(extractConcentracao("500 MG COM CT BL AL X 20"), "500 MG");
  assert.equal(extractConcentracao("50 MG COM REV CT BL"), "50 MG");
  assert.equal(extractConcentracao("100 MG/ML SOL OR CT FR"), "100 MG/ML");
  assert.equal(extractConcentracao("SEM DOSE AQUI"), null);
});

test("grupoKey junta substancia + concentracao normalizados", () => {
  assert.equal(grupoKey("DIPIRONA", "500 MG"), "dipirona|500mg");
  assert.equal(grupoKey("Losartana Potássica", "50 MG"), "losartana potassica|50mg");
});

test("toAppMed marca de graca e monta o grupo", () => {
  const a: Apresentacao = {
    ggrem: "123", registro: "r", substancia: "DIPIRONA", produto: "DIPIRONA (G)",
    laboratorio: "EMS", cnpj: null, apresentacao: "500 MG COM CT BL AL X 20",
    classe_terapeutica: "ANALGESICOS", tipo: "Generico", tarja: "Tarja Vermelha",
    regime: "Liberado", restricao_hospitalar: "Nao", eans: ["7891234567895"],
    pmc: { "19": 1234 }, vigencia: "2026-06",
  };
  const m = toAppMed(a, true, "HIPERTENSÃO");
  assert.equal(m.deGraca, true);
  assert.equal(m.pfpbIndicacao, "HIPERTENSÃO");
  assert.equal(m.concentracao, "500 MG");
  assert.equal(m.grupo, "dipirona|500mg");
  assert.equal(m.semTeto, true); // regime Liberado
  assert.equal(m.slug, "dipirona-g-500-mg");
  assert.equal(m.id, "dipirona-g-500-mg-123");
});
