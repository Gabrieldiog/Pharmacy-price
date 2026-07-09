import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDestaques, type DestaqueMedInput } from "./destaques";

function med(p: Partial<DestaqueMedInput> & { id: string }): DestaqueMedInput {
  return {
    produto: p.id, substancia: null, concentracao: null, apresentacao: null, laboratorio: null,
    tarja: null, deGraca: false, indicacao: null, semTeto: false, tetoGo: null, precos: [], grupo: null,
    ...p,
  };
}

test("economia: pega a maior diferenca na mesma apresentacao exata", () => {
  const meds = [
    med({ id: "advil", produto: "ADVIL", grupo: "ibuprofeno|400mg", apresentacao: "X 60", laboratorio: "GSK", precos: [{ rede: "X", centavos: 899 }] }),
    med({ id: "ibuflex", produto: "IBUFLEX", grupo: "ibuprofeno|400mg", apresentacao: "X 60", laboratorio: "Legrand", precos: [{ rede: "X", centavos: 449 }] }),
  ];
  const d = computeDestaques(meds);
  assert.equal(d.economia.length, 1);
  assert.equal(d.economia[0]?.id, "ibuflex"); // link do mais barato
  assert.equal(d.economia[0]?.baratoCents, 449);
  assert.equal(d.economia[0]?.caroCents, 899);
  assert.equal(d.economia[0]?.economiaPct, 50);
});

test("economia: ignora apresentacoes diferentes (evita falso desconto de caixa)", () => {
  const meds = [
    med({ id: "a", grupo: "g|500mg", apresentacao: "X 60", precos: [{ rede: "X", centavos: 2000 }] }),
    med({ id: "b", grupo: "g|500mg", apresentacao: "X 10", precos: [{ rede: "X", centavos: 500 }] }),
  ];
  assert.equal(computeDestaques(meds).economia.length, 0);
});

test("economia: nao gera 'X no lugar de X' (mesmo nome de produto)", () => {
  const meds = [
    med({ id: "a", produto: "OMEPRAZOL", grupo: "omeprazol|20mg", apresentacao: "X 28", laboratorio: "Medley", precos: [{ rede: "X", centavos: 1219 }] }),
    med({ id: "b", produto: "OMEPRAZOL", grupo: "omeprazol|20mg", apresentacao: "X 28", laboratorio: "Brainfarma", precos: [{ rede: "X", centavos: 3319 }] }),
  ];
  assert.equal(computeDestaques(meds).economia.length, 0);
});

test("gratis: um card por indicacao distinta", () => {
  const meds = [
    med({ id: "a", deGraca: true, indicacao: "HIPERTENSÃO" }),
    med({ id: "b", deGraca: true, indicacao: "hipertensão" }), // mesma indicacao
    med({ id: "c", deGraca: true, indicacao: "DIABETES" }),
  ];
  const g = computeDestaques(meds).gratis;
  assert.equal(g.length, 2);
});

test("acimaDoTeto: detecta preco acima do teto legal", () => {
  const meds = [
    med({ id: "ok", tetoGo: 1000, precos: [{ rede: "X", centavos: 800 }] }),
    med({ id: "caro", produto: "CARO", tetoGo: 1000, precos: [{ rede: "Y", centavos: 1200 }] }),
  ];
  const a = computeDestaques(meds).acimaDoTeto;
  assert.equal(a.length, 1);
  assert.equal(a[0]?.id, "caro");
  assert.equal(a[0]?.acimaPct, 20);
});

test("tarja preta nao entra em card de preco na home (guard preventivo)", () => {
  // preco espurio casado a um controlado: nao pode virar 'economia' nem 'acima do teto'
  const meds = [
    med({ id: "barato", produto: "GENERICO", grupo: "x|10mg", apresentacao: "X 30", precos: [{ rede: "X", centavos: 500 }] }),
    med({ id: "preto", produto: "CONTROLADO", grupo: "x|10mg", apresentacao: "X 30", tarja: "Tarja Preta", precos: [{ rede: "Y", centavos: 5000 }] }),
    med({ id: "acima", produto: "PRETO2", tarja: "Tarja Preta", tetoGo: 1000, precos: [{ rede: "Z", centavos: 9000 }] }),
  ];
  const d = computeDestaques(meds);
  assert.equal(d.economia.length, 0); // o "caro" seria o preto (5000) -> sem par valido
  assert.equal(d.acimaDoTeto.length, 0); // o preto acima do teto foi suprimido
});
