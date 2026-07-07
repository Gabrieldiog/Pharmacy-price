// Merge de precos por rede para um mesmo EAN. Cada rede entra uma vez, com o menor
// preco visto; a lista final sai ordenada do mais barato pro mais caro (o comparador).
export interface RedePreco {
  rede: string;
  centavos: number;
}

export function upsertPreco(atual: RedePreco[], rede: string, centavos: number): RedePreco[] {
  const i = atual.findIndex((p) => p.rede === rede);
  if (i < 0) return [...atual, { rede, centavos }];
  const found = atual[i];
  if (found && centavos < found.centavos) atual[i] = { rede, centavos };
  return atual;
}

export function sortRedePrecos(precos: RedePreco[]): RedePreco[] {
  return [...precos].sort((a, b) => a.centavos - b.centavos);
}
