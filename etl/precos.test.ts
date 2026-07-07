import { test } from "node:test";
import assert from "node:assert/strict";
import { upsertPreco, sortRedePrecos } from "./precos";

test("upsertPreco: adiciona uma rede nova", () => {
  const r = upsertPreco([], "Drogal", 509);
  assert.deepEqual(r, [{ rede: "Drogal", centavos: 509 }]);
});

test("upsertPreco: mantem o menor preco da mesma rede", () => {
  let r = upsertPreco([], "Pague Menos", 700);
  r = upsertPreco(r, "Pague Menos", 505); // menor -> substitui
  r = upsertPreco(r, "Pague Menos", 999); // maior -> ignora
  assert.equal(r.length, 1);
  assert.equal(r[0]?.centavos, 505);
});

test("upsertPreco: acumula redes diferentes", () => {
  let r = upsertPreco([], "Pague Menos", 505);
  r = upsertPreco(r, "Drogal", 509);
  r = upsertPreco(r, "São João", 574);
  assert.equal(r.length, 3);
});

test("sortRedePrecos: ordena do mais barato pro mais caro", () => {
  const r = sortRedePrecos([
    { rede: "São João", centavos: 574 },
    { rede: "Pague Menos", centavos: 505 },
    { rede: "Drogal", centavos: 509 },
  ]);
  assert.deepEqual(
    r.map((p) => p.rede),
    ["Pague Menos", "Drogal", "São João"],
  );
});
