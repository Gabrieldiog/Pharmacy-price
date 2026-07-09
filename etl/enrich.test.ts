import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, extractConcentracao, doseCompleta, formaBucket, liberacao, grupoKey, toAppMed } from "./enrich";
import type { Apresentacao } from "./types";

test("slugify remove acentos e normaliza", () => {
  assert.equal(slugify("Dipirona Monoidratada 500MG"), "dipirona-monoidratada-500mg");
  assert.equal(slugify("  Losartana Potássica  "), "losartana-potassica");
});

test("extractConcentracao pega a primeira dose (usada no slug/id — estável)", () => {
  assert.equal(extractConcentracao("500 MG COM CT BL AL X 20"), "500 MG");
  assert.equal(extractConcentracao("100 MG/ML SOL OR CT FR"), "100 MG/ML");
  assert.equal(extractConcentracao("SEM DOSE AQUI"), null);
});

test("doseCompleta pega TODAS as doses do combo (não trunca)", () => {
  assert.equal(doseCompleta("500 MG COM CT BL AL X 20"), "500 MG");
  assert.equal(doseCompleta("100 MG/ML SOL OR CT FR"), "100 MG/ML");
  assert.equal(doseCompleta("5 MG + 50 MG COM REV CT BL AL X 30"), "5 MG + 50 MG");
  // formato entre parênteses da CMED: a unidade vem depois do ")"
  assert.equal(doseCompleta("(0,035 + 2) MG COM REV CT BL AL X 21"), "0,035 MG + 2 MG");
  assert.equal(doseCompleta("10 MG/G + 0,443 MG/G CREM DERM CT BG AL X 40 G"), "10 MG/G + 0,443 MG/G");
  // não pega o tamanho da embalagem ("X 40 G") como se fosse dose
  assert.equal(doseCompleta("15 MG/G CREM DERM CT BG AL X 30 G"), "15 MG/G");
  // xarope por volume: mantém o "/5 ML" (senão a dose fica errada e perde o 2º ativo)
  assert.equal(doseCompleta("400 MG/5 ML SOL OR CT FR PLAS X 150 ML"), "400 MG/5 ML");
  assert.equal(doseCompleta("2 MG/5 ML + 0,25 MG/5 ML SOL OR CT FR X 120 ML"), "2 MG/5 ML + 0,25 MG/5 ML");
});

test("formaBucket separa o que NÃO é intercambiável", () => {
  assert.equal(formaBucket("500 MG COM REV CT BL AL X 30"), "oralsol");
  assert.equal(formaBucket("500 MG CAP DURA CT BL AL X 30"), "oralsol");
  assert.equal(formaBucket("125 MG/ML SOL INJ SC CT 4 SER"), "inj");
  assert.equal(formaBucket("80 MG PO LIOF SOL INJ SC CT FA"), "inj");
  assert.equal(formaBucket("3,6 MG DEPOT + SER PREENC"), "inj"); // seringa/depot
  assert.equal(formaBucket("100 MG GRAN CT 16 ENV X 5 G"), "oralsol"); // granulado oral
  assert.equal(formaBucket("10 MG/G CREM DERM CT BG AL X 40 G"), "topico");
  assert.equal(formaBucket("100 MG/ML SOL OR CT FR PLAS"), "oralliq");
  // capsula gelatinosa NÃO é gel tópico (CAP ganha de GEL)
  assert.equal(formaBucket("500 MG CAP GEL CT BL AL X 10"), "oralsol");
  // infusão IV (sem a palavra "INJ") é injetável, não oral
  assert.equal(formaBucket("10 MG/ML SOL INFUS CT FR X 20 ML"), "inj");
  // solução tópica não é oral
  assert.equal(formaBucket("10 MG/ML SOL TOP CT FR PLAS X 30 ML"), "topico");
});

test("liberacao marca prolongada (não é a mesma coisa que a comum)", () => {
  assert.equal(liberacao("500 MG COM LIB PROL CT BL AL X 30"), "lp");
  assert.equal(liberacao("11 MG COM REV LIB PROL CT FR X 30"), "lp");
  assert.equal(liberacao("200 MG CAP AP CT BL AL X 6"), "lp"); // AP = ação prolongada
  assert.equal(liberacao("500 MG COM CT BL AL X 30"), "");
});

test("grupoKey: SÓ agrupa o que é de fato intercambiável", () => {
  const met = (ap: string) => grupoKey("CLORIDRATO DE METFORMINA", ap);
  // liberação prolongada (Glifage XR) != metformina comum, mesma dose
  assert.notEqual(met("500 MG COM LIB PROL CT BL AL X 30"), met("500 MG COM CT BL AL X 30"));
  // injetável != comprimido, mesmo ativo e dose
  const ceto = (ap: string) => grupoKey("CETOPROFENO", ap);
  assert.notEqual(ceto("100 MG SOL INJ CT FA"), ceto("100 MG COM REV CT BL X 20"));
  // combo com doses diferentes != (5+50 vs 5+25)
  const bet = (ap: string) => grupoKey("ATENOLOL;BESILATO DE ANLODIPINO", ap);
  assert.notEqual(bet("5 MG + 50 MG COM REV CT BL X 30"), bet("5 MG + 25 MG COM REV CT BL X 30"));
});

test("grupoKey: combo de forças assimétricas NÃO se junta com a ordem trocada (segurança)", () => {
  // bisoprolol 5 / anlodipino 10  !=  bisoprolol 10 / anlodipino 5 — trocar dobraria
  // um ativo e cortaria o outro pela metade. Por isso a dose do combo não é ordenada.
  const a = grupoKey("BESILATO DE ANLODIPINO;HEMIFUMARATO DE BISOPROLOL", "(5,0 + 10,0) MG COM REV CT BL X 30");
  const b = grupoKey("BESILATO DE ANLODIPINO;HEMIFUMARATO DE BISOPROLOL", "(10,0 + 5,0) MG COM REV CT BL X 30");
  assert.notEqual(a, b);
});

test("grupoKey: mesmo comprimido em embalagens diferentes = mesma chave", () => {
  assert.equal(
    grupoKey("SINVASTATINA", "40 MG COM REV CT BL AL PLAS X 30"),
    grupoKey("SINVASTATINA", "40 MG COM REV CT BL AL PLAS X 60"),
  );
});

test("grupoKey não fragmenta por pontuação/espaço na substância", () => {
  assert.equal(
    grupoKey("Amoxicilina Tri-Hidratada", "500 MG CAP DURA CT BL X 21"),
    grupoKey("Amoxicilina Trihidratada", "500 MG CAP DURA CT BL X 21"),
  );
});

test("toAppMed marca de graça e monta o grupo (com forma e liberação)", () => {
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
  assert.equal(m.grupo, "dipirona|500mg|oralsol|");
  assert.equal(m.semTeto, true); // regime Liberado
  assert.equal(m.slug, "dipirona-g-500-mg"); // slug ainda pela 1a dose (id estável)
  assert.equal(m.id, "dipirona-g-500-mg-123");
});
