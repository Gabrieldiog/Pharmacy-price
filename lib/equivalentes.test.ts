import { test } from "node:test";
import assert from "node:assert/strict";
import { equivalentes, menorPreco, ordenaPorUtilidade, agrupaResultados, genericoMaisBarato, type MedsIndex } from "./meds-client";
import type { ClientMed } from "./types";

function med(id: string, grupo: string | null, precos: { rede: string; centavos: number }[], tetoGo: number | null = null): ClientMed {
  return {
    id, produto: id, substancia: null, concentracao: null, apresentacao: null,
    laboratorio: null, tipo: null, tarja: null, deGraca: false, indicacao: null,
    semTeto: false, tetoGo, precos, grupo,
  };
}

function idxDe(meds: ClientMed[]): MedsIndex {
  const byGrupo = new Map<string, ClientMed[]>();
  for (const m of meds) if (m.grupo) (byGrupo.get(m.grupo) ?? byGrupo.set(m.grupo, []).get(m.grupo)!).push(m);
  return { byId: new Map(), byGrupo, mini: null as never, meta: null };
}

test("menorPreco: pega o primeiro (mais barato) ou null", () => {
  assert.equal(menorPreco(med("a", "g", [{ rede: "X", centavos: 500 }])), 500);
  assert.equal(menorPreco(med("b", "g", [])), null);
});

test("equivalentes: exclui o proprio e ordena do mais barato pro sem preco", () => {
  const a = med("a", "dipirona|500mg", [{ rede: "X", centavos: 900 }]);
  const b = med("b", "dipirona|500mg", [{ rede: "Y", centavos: 500 }]);
  const c = med("c", "dipirona|500mg", [], 300); // sem preco praticado, so teto
  const idx = idxDe([a, b, c]);
  const eq = equivalentes(idx, a);
  assert.deepEqual(eq.map((m) => m.id), ["b", "c"]); // b (500) antes de c (sem preco)
});

test("equivalentes: sem grupo retorna vazio", () => {
  const a = med("a", null, [{ rede: "X", centavos: 500 }]);
  assert.deepEqual(equivalentes(idxDe([a]), a), []);
});

test("ordenaPorUtilidade: de graça primeiro, depois com preço, depois o resto (estável)", () => {
  const gratis = { ...med("gratis", null, []), deGraca: true };
  const caro = med("caro", null, [{ rede: "X", centavos: 900 }]);
  const barato = med("barato", null, [{ rede: "X", centavos: 500 }]);
  const soTeto = med("soteto", null, [], 1000);
  const preta = { ...med("preta", null, [{ rede: "X", centavos: 700 }]), tarja: "Tarja Preta" };
  // ordem de entrada (relevância): caro, soTeto, gratis, preta, barato
  const out = ordenaPorUtilidade([caro, soTeto, gratis, preta, barato]).map((m) => m.id);
  // de graça sobe; caro/barato mantêm a ordem de entrada (desempate por relevância);
  // preta cai no "resto" porque o preço de controlado é suprimido (menorPreco = null)
  assert.deepEqual(out, ["gratis", "caro", "barato", "soteto", "preta"]);
});

test("agrupaResultados: junta mesmo produto+grupo, mantém marca separada, rep = mais barato", () => {
  const g = "dipirona|500mg|oralliq|";
  const a = { ...med("dip-ems", g, [{ rede: "X", centavos: 800 }]), produto: "DIPIRONA" };
  const b = { ...med("dip-medley", g, [{ rede: "X", centavos: 500 }]), produto: "DIPIRONA" };
  const nova = { ...med("novalgina", g, [{ rede: "X", centavos: 4000 }]), produto: "NOVALGINA" };
  const grupos = agrupaResultados([a, b, nova]);
  assert.equal(grupos.length, 2); // DIPIRONA (a+b) e NOVALGINA
  assert.equal(grupos[0]!.total, 2); // as duas marcas da dipirona genérica juntas
  assert.equal(grupos[0]!.rep.id, "dip-medley"); // rep = o mais barato (500)
  assert.equal(grupos[1]!.rep.produto, "NOVALGINA"); // marca não funde com o genérico
});

test("genericoMaisBarato: aponta o genérico bem mais barato; nada quando não faz sentido", () => {
  const g = "dipirona|500mg|oralliq|";
  const genA = { ...med("gen-a", g, [{ rede: "X", centavos: 800 }]), tipo: "Generico" };
  const genB = { ...med("gen-b", g, [{ rede: "X", centavos: 500 }]), tipo: "Generico" };
  const marca = { ...med("marca", g, [{ rede: "X", centavos: 4000 }]), tipo: "Novo" };
  const idx = idxDe([genA, genB, marca]);
  assert.deepEqual(genericoMaisBarato(idx, marca), { id: "gen-b", produto: "gen-b", centavos: 500 });
  assert.equal(genericoMaisBarato(idx, genA), null); // o próprio já é genérico
  const marcaBarata = { ...med("mb", g, [{ rede: "X", centavos: 100 }]), tipo: "Novo" };
  assert.equal(genericoMaisBarato(idxDe([genA, genB, marcaBarata]), marcaBarata), null); // nenhum genérico mais barato
  // NÃO manda pagar pelo que é de graça
  const marcaGratis = { ...med("mg", g, [{ rede: "X", centavos: 4000 }]), tipo: "Novo", deGraca: true };
  assert.equal(genericoMaisBarato(idxDe([genA, genB, marcaGratis]), marcaGratis), null);
  // sem preço-base -> não afirma "mais barato"
  const marcaSemPreco = { ...med("msp", g, []), tipo: "Novo" };
  assert.equal(genericoMaisBarato(idxDe([genA, genB, marcaSemPreco]), marcaSemPreco), null);
  // economia pequena (R$0,50 / 9%, < R$3 e < 20%) -> não mostra ("bem mais barato" seria desonesto)
  const quaseIgual = { ...med("qi", g, [{ rede: "X", centavos: 550 }]), tipo: "Novo" };
  assert.equal(genericoMaisBarato(idxDe([genA, genB, quaseIgual]), quaseIgual), null);
});
