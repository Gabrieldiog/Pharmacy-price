import { test } from "node:test";
import assert from "node:assert/strict";
import { textoDenuncia } from "./denuncia";

test("textoDenuncia: inclui remedio, precos e a diferenca", () => {
  const t = textoDenuncia({ produto: "DIPIRONA", precoCents: 1500, tetoCents: 1000, farmacia: "Drogaria X", uf: "GO" });
  assert.match(t, /DIPIRONA/);
  assert.match(t, /Drogaria X/);
  assert.match(t, /R\$ 15,00/); // cobrado
  assert.match(t, /R\$ 10,00/); // teto
  assert.match(t, /R\$ 5,00/); // diferenca
  assert.match(t, /PMC/);
  assert.match(t, /CMED/);
});

test("textoDenuncia: omite o estabelecimento quando nao informado", () => {
  const t = textoDenuncia({ produto: "DIPIRONA", precoCents: 1500, tetoCents: 1000 });
  assert.doesNotMatch(t, /Estabelecimento/);
  assert.match(t, /em GO/); // uf padrao
});
