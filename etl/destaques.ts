import type { Destaques, EconomiaCard, GratisCard, TetoCard } from "../lib/types";
import { isControlado } from "../lib/med-format";

// Entrada minima (subset do ClientMed) pro calculo dos destaques da home.
export interface DestaqueMedInput {
  id: string;
  produto: string;
  substancia: string | null;
  concentracao: string | null;
  apresentacao: string | null;
  laboratorio: string | null;
  tarja: string | null;
  deGraca: boolean;
  indicacao: string | null;
  semTeto: boolean;
  tetoGo: number | null;
  precos: { rede: string; centavos: number }[]; // ordenado asc
  grupo: string | null;
}

// tarja preta (controlado forte) nunca entra num card de preco na home — mesmo
// guard do resto do app, aqui no pre-calculo dos destaques
const menor = (m: DestaqueMedInput) => (isControlado(m.tarja) ? null : m.precos[0]?.centavos ?? null);

// Economia: mesma apresentacao EXATA (mesmo grupo + apresentacao) com precos diferentes.
// Comparar a apresentacao exata evita o falso "desconto" que so vem de tamanho de caixa.
function economiaCards(meds: DestaqueMedInput[]): EconomiaCard[] {
  const byApres = new Map<string, DestaqueMedInput[]>();
  for (const m of meds) {
    if (!m.grupo || !m.apresentacao || menor(m) == null) continue;
    const key = `${m.grupo}||${m.apresentacao}`;
    const arr = byApres.get(key);
    if (arr) arr.push(m);
    else byApres.set(key, [m]);
  }
  const cards: EconomiaCard[] = [];
  for (const arr of byApres.values()) {
    if (arr.length < 2) continue;
    const sorted = [...arr].sort((a, b) => menor(a)! - menor(b)!);
    const barato = sorted[0]!;
    const caro = sorted[sorted.length - 1]!;
    const pb = menor(barato)!;
    const pc = menor(caro)!;
    if (pc - pb < 300) continue; // ao menos R$3 de diferenca
    // na home o card so faz sentido quando os nomes diferem ("X no lugar de Y"), nunca "X no lugar de X"
    if (barato.produto.toLowerCase() === caro.produto.toLowerCase()) continue;
    const pct = Math.round((1 - pb / pc) * 100);
    if (pct < 25) continue;
    cards.push({
      id: barato.id,
      substancia: barato.substancia,
      concentracao: barato.concentracao,
      apresentacao: barato.apresentacao,
      baratoProduto: barato.produto,
      baratoLab: barato.laboratorio,
      baratoCents: pb,
      caroProduto: caro.produto,
      caroLab: caro.laboratorio,
      caroCents: pc,
      economiaPct: pct,
    });
  }
  cards.sort((a, b) => b.caroCents - b.baratoCents - (a.caroCents - a.baratoCents));
  // variedade: no maximo um card por substancia (senao a lista vira so estatina)
  const vistas = new Set<string>();
  const diversos: EconomiaCard[] = [];
  for (const c of cards) {
    const s = (c.substancia ?? "").toLowerCase();
    if (vistas.has(s)) continue;
    vistas.add(s);
    diversos.push(c);
  }
  return diversos;
}

// De graca: um card por indicacao distinta (variedade > repeticao).
function gratisCards(meds: DestaqueMedInput[]): GratisCard[] {
  const cards: GratisCard[] = [];
  const vistas = new Set<string>();
  for (const m of meds) {
    if (!m.deGraca || !m.indicacao) continue;
    const ind = m.indicacao.toLowerCase();
    if (vistas.has(ind)) continue;
    vistas.add(ind);
    cards.push({ id: m.id, produto: m.produto, substancia: m.substancia, indicacao: m.indicacao });
  }
  return cards;
}

// Acima do teto: preco praticado maior que o teto legal (o alerta — raro, mas importa).
function acimaCards(meds: DestaqueMedInput[]): TetoCard[] {
  const cards: TetoCard[] = [];
  for (const m of meds) {
    if (m.semTeto || m.tetoGo == null) continue;
    const p = menor(m);
    if (p == null || p <= m.tetoGo) continue;
    cards.push({
      id: m.id,
      produto: m.produto,
      cents: p,
      teto: m.tetoGo,
      acimaPct: Math.round((p / m.tetoGo - 1) * 100),
      rede: m.precos[0]!.rede,
    });
  }
  return cards.sort((a, b) => b.acimaPct - a.acimaPct);
}

export function computeDestaques(meds: DestaqueMedInput[]): Destaques {
  return {
    economia: economiaCards(meds).slice(0, 4),
    gratis: gratisCards(meds).slice(0, 4),
    acimaDoTeto: acimaCards(meds).slice(0, 2),
  };
}
