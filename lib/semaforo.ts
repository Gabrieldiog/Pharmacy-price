// Semaforo: compara o preco praticado com o teto legal (ambos em centavos).
// Verde = folga; ambar = colado no teto; vermelho = acima do teto (denuncie).
export interface Semaforo {
  cls: "verde" | "ambar" | "vermelho";
  label: string;
  pct: number; // preco / teto
}

export function semaforo(precoCents: number, tetoCents: number): Semaforo | null {
  if (!precoCents || !tetoCents || tetoCents <= 0) return null;
  const pct = precoCents / tetoCents;
  const diff = Math.round((1 - pct) * 100);
  if (pct > 1) return { cls: "vermelho", label: `${Math.abs(diff)}% acima do teto`, pct };
  if (pct > 0.9) return { cls: "ambar", label: "quase no teto", pct };
  return { cls: "verde", label: `${diff}% abaixo do teto`, pct };
}
