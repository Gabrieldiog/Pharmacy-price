import { test } from "node:test";
import assert from "node:assert/strict";
import { semaforo } from "./semaforo";

test("verde: bem abaixo do teto", () => {
  const s = semaforo(5000, 10000);
  assert.equal(s?.cls, "verde");
  assert.equal(s?.label, "50% abaixo do teto");
});

test("âmbar 'quase no teto': colado, mas ainda abaixo (>90%)", () => {
  assert.equal(semaforo(9500, 10000)?.cls, "ambar");
  assert.equal(semaforo(9500, 10000)?.label, "quase no teto");
});

test("vermelho por VALOR: R$4,90 acima num teto de R$500 (o piso % sozinho esconderia)", () => {
  // exatamente o caso que a revisão pegou: <1% acima, mas R$4,90 reais a mais
  const s = semaforo(50490, 50000);
  assert.equal(s?.cls, "vermelho");
  assert.equal(s?.label, "R$ 4,90 acima do teto");
});

test("vermelho por PERCENTUAL: remédio barato 2% acima (poucos centavos, mas é padrão)", () => {
  const s = semaforo(510, 500); // R$0,10 acima = 2%
  assert.equal(s?.cls, "vermelho");
  assert.equal(s?.label, "R$ 0,10 acima do teto");
});

test("1 centavo acima NÃO acusa e NÃO diz 'quase no teto' (está acima → 'no teto legal')", () => {
  const s = semaforo(10001, 10000);
  assert.equal(s?.cls, "ambar");
  assert.equal(s?.label, "no teto legal"); // neutro, não "quase no teto" (que soaria abaixo)
});

test("exatamente no teto é 'no teto legal', não 'quase no teto'", () => {
  const s = semaforo(10000, 10000);
  assert.equal(s?.cls, "ambar");
  assert.equal(s?.label, "no teto legal");
});

test("excesso minúsculo em remédio caro fica no ruído (nem R$0,50 nem 2%)", () => {
  // R$0,40 acima de R$500 = 0,08% -> nem o piso em reais nem o percentual
  assert.equal(semaforo(50040, 50000)?.cls, "ambar");
  assert.equal(semaforo(50040, 50000)?.label, "no teto legal");
});

test("rótulo vermelho é sempre o valor em reais, nunca '0%' nem '%'", () => {
  let viuVermelho = false;
  for (let p = 10000; p <= 11000; p += 7) {
    const s = semaforo(p, 10000);
    if (s?.cls === "vermelho") {
      viuVermelho = true;
      assert.match(s.label, /^R\$ .+ acima do teto$/);
      assert.doesNotMatch(s.label, /%/);
    }
  }
  assert.equal(viuVermelho, true);
});

test("fronteira do piso em reais: R$0,50 acusa, R$0,49 não (pino do >=)", () => {
  assert.equal(semaforo(10050, 10000)?.cls, "vermelho"); // R$0,50 -> acusa
  assert.equal(semaforo(10049, 10000)?.cls, "ambar"); // R$0,49 e <2% -> ruído
});

test("fronteira do piso percentual (remédio barato): 2% acusa, 1,8% não", () => {
  assert.equal(semaforo(510, 500)?.cls, "vermelho"); // 2%
  assert.equal(semaforo(509, 500)?.cls, "ambar"); // 1,8% e R$0,09 -> < ambos os pisos
});

test("os dois pisos são independentes — nenhum sozinho dá conta (mata mutações)", () => {
  // só o piso EM REAIS pega (0,6% < 2%, mas R$3,00): remover o piso em reais viraria âmbar
  assert.equal(semaforo(50300, 50000)?.cls, "vermelho"); // R$3,00 / 0,6%
  // só o piso PERCENTUAL pega (R$0,15 < R$0,50, mas 3%): remover o % viraria âmbar
  assert.equal(semaforo(515, 500)?.cls, "vermelho"); // R$0,15 / 3%
});

test("null quando a entrada não é preço/teto válido (não inventa veredito)", () => {
  assert.equal(semaforo(0, 100), null);
  assert.equal(semaforo(100, 0), null);
  assert.equal(semaforo(100, -5), null);
  assert.equal(semaforo(-100, 100), null); // preço negativo
  assert.equal(semaforo(NaN, 100), null);
  assert.equal(semaforo(Infinity, 100), null); // não finito
  assert.equal(semaforo(100, Infinity), null);
});
