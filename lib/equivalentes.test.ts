import { test } from "node:test";
import assert from "node:assert/strict";
import { equivalentes, menorPreco, type MedsIndex } from "./meds-client";
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
