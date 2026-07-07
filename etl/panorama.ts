// Numeros agregados do dataset pra pagina de panorama ("eu conheco o terreno").
export interface PanoramaMedInput {
  id: string;
  produto: string;
  deGraca: boolean;
  indicacao: string | null;
  semTeto: boolean;
  tetoGo: number | null;
  precos: { rede: string; centavos: number }[];
  grupo: string | null;
}

export interface PanoramaIndicacao {
  indicacao: string;
  count: number;
}

// Parte derivada dos medicamentos (o build completa com cobertura das redes).
export interface PanoramaMeds {
  totalMeds: number;
  comTeto: number;
  deGraca: number;
  comPreco: number;
  economiaMediaPct: number | null; // media de quanto o menor preco fica abaixo do teto
  gratisTopIndicacoes: PanoramaIndicacao[];
  gratisMaisCaro: { id: string; produto: string; cents: number } | null;
}

const menor = (m: PanoramaMedInput) => m.precos[0]?.centavos ?? null;

// Mediana do teto por grupo — pra descartar linha isolada com PMC absurdo da CMED
// (ex.: uma sinvastatina 40mg listada a R$453 num grupo cujos pares custam ~R$30).
function medianasPorGrupo(meds: PanoramaMedInput[]): Map<string, number> {
  const tetos = new Map<string, number[]>();
  for (const m of meds) {
    if (!m.grupo || m.tetoGo == null || m.semTeto) continue;
    const arr = tetos.get(m.grupo);
    if (arr) arr.push(m.tetoGo);
    else tetos.set(m.grupo, [m.tetoGo]);
  }
  const med = new Map<string, number>();
  for (const [g, arr] of tetos) {
    if (arr.length < 3) continue; // grupo pequeno demais pra corroborar
    const s = [...arr].sort((a, b) => a - b);
    med.set(g, s[Math.floor(s.length / 2)]!);
  }
  return med;
}

export function computePanorama(meds: PanoramaMedInput[]): PanoramaMeds {
  const medianas = medianasPorGrupo(meds);
  let comTeto = 0;
  let deGraca = 0;
  let comPreco = 0;

  // media de (1 - menorPreco/teto): quanto os precos reais ficam abaixo do teto
  let somaAbaixo = 0;
  let nAbaixo = 0;

  const porIndicacao = new Map<string, number>();
  let gratisMaisCaro: { id: string; produto: string; cents: number } | null = null;

  for (const m of meds) {
    const temTeto = m.tetoGo != null && !m.semTeto;
    if (temTeto) comTeto++;
    if (m.precos.length > 0) comPreco++;

    const p = menor(m);
    if (p != null && temTeto && p <= m.tetoGo!) {
      somaAbaixo += 1 - p / m.tetoGo!;
      nAbaixo++;
    }

    if (m.deGraca) {
      deGraca++;
      if (m.indicacao) {
        const ind = m.indicacao.trim();
        porIndicacao.set(ind, (porIndicacao.get(ind) ?? 0) + 1);
      }
      if (m.tetoGo != null) {
        const mediana = m.grupo ? medianas.get(m.grupo) : undefined;
        const plausivel = mediana == null || m.tetoGo <= mediana * 2.5; // corta outlier de PMC
        if (plausivel && (gratisMaisCaro == null || m.tetoGo > gratisMaisCaro.cents)) {
          gratisMaisCaro = { id: m.id, produto: m.produto, cents: m.tetoGo };
        }
      }
    }
  }

  const gratisTopIndicacoes = [...porIndicacao.entries()]
    .map(([indicacao, count]) => ({ indicacao, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    totalMeds: meds.length,
    comTeto,
    deGraca,
    comPreco,
    economiaMediaPct: nAbaixo > 0 ? Math.round((somaAbaixo / nAbaixo) * 100) : null,
    gratisTopIndicacoes,
    gratisMaisCaro,
  };
}
