import { brl } from "./med-format";

// Semaforo: compara o preco praticado com o teto legal (ambos em centavos).
// Verde = folga; ambar = colado no teto; vermelho = acima do teto (denuncie).
export interface Semaforo {
  cls: "verde" | "ambar" | "vermelho";
  label: string;
  pct: number; // preco / teto
}

// so acusa "acima do teto" (vermelho -> denuncia) quando o excesso e relevante: por
// pelo menos R$0,50 OU pelo menos 2% acima. Um piso cobre o remedio caro (R$4,90 num
// teto de R$500 = <1%, pega pelo piso em reais) e o outro o barato (poucos centavos,
// mas %, pega pelo piso percentual). Abaixo dos dois e ruido de arredondamento/coleta:
// nao da pra acusar uma farmacia de ilegalidade por 1 centavo. O rotulo mostra o valor
// exato cobrado a mais (nao um "%", que arredondaria pra "0%" num remedio caro).
const ACIMA_CENTAVOS_MIN = 50; // R$0,50
const ACIMA_FRACAO_MIN = 0.02; // 2%

export function semaforo(precoCents: number, tetoCents: number): Semaforo | null {
  // exige numeros finitos e positivos (pega 0, NaN, Infinity, negativo)
  if (!Number.isFinite(precoCents) || !Number.isFinite(tetoCents) || precoCents <= 0 || tetoCents <= 0) {
    return null;
  }
  const pct = precoCents / tetoCents;
  const acimaCents = precoCents - tetoCents;
  if (acimaCents >= ACIMA_CENTAVOS_MIN || (acimaCents > 0 && pct - 1 >= ACIMA_FRACAO_MIN)) {
    return { cls: "vermelho", label: `${brl(acimaCents)} acima do teto`, pct };
  }
  // no teto ou pouco acima (dentro do ruido): neutro, nunca "quase no teto" (soaria "abaixo")
  if (pct >= 1) return { cls: "ambar", label: "no teto legal", pct };
  // colado no teto, ainda abaixo
  if (pct > 0.9) return { cls: "ambar", label: "quase no teto", pct };
  return { cls: "verde", label: `${Math.round((1 - pct) * 100)}% abaixo do teto`, pct };
}
