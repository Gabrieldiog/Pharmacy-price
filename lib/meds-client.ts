"use client";

import MiniSearch from "minisearch";
import type { ClientMed, PrecosMeta } from "@/lib/types";
import { isControlado } from "@/lib/med-format";

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export interface MedsIndex {
  byId: Map<string, ClientMed>;
  byGrupo: Map<string, ClientMed[]>; // equivalencia: substancia|concentracao -> remedios
  mini: MiniSearch;
  meta: PrecosMeta | null;
}

// menor preco praticado do medicamento (centavos), ou null se nao houver. Tarja
// preta (controlado forte) nunca mostra preco — qualquer preco casado e espurio —,
// entao aqui tambem some, pra a lista de equivalentes ficar consistente com a pagina.
export function menorPreco(m: ClientMed): number | null {
  if (isControlado(m.tarja)) return null;
  return m.precos?.[0]?.centavos ?? null;
}

// remedios equivalentes (mesma substancia+dose), sem o proprio, do mais barato pro mais caro
export function equivalentes(idx: MedsIndex, med: ClientMed): ClientMed[] {
  if (!med.grupo) return [];
  const grupo = idx.byGrupo.get(med.grupo) ?? [];
  return grupo
    .filter((m) => m.id !== med.id)
    .sort((a, b) => {
      const pa = menorPreco(a) ?? Infinity;
      const pb = menorPreco(b) ?? Infinity;
      if (pa !== pb) return pa - pb;
      return (a.tetoGo ?? Infinity) - (b.tetoGo ?? Infinity);
    });
}

// Carrega a base do cliente e monta o indice de busca uma unica vez.
// Reusado pela home (Search) e pela pagina de colaboracao.
export async function loadMedsIndex(): Promise<MedsIndex> {
  const [data, meta] = await Promise.all([
    fetch("/medicamentos-go.json").then((r) => r.json()) as Promise<ClientMed[]>,
    fetch("/precos-meta.json").then((r) => r.json()).catch(() => null) as Promise<PrecosMeta | null>,
  ]);
  const byId = new Map<string, ClientMed>();
  const byGrupo = new Map<string, ClientMed[]>();
  for (const med of data) {
    byId.set(med.id, med);
    if (med.grupo) {
      const g = byGrupo.get(med.grupo);
      if (g) g.push(med);
      else byGrupo.set(med.grupo, [med]);
    }
  }
  const mini = new MiniSearch({
    idField: "id",
    fields: ["produto", "substancia"],
    processTerm: norm,
    searchOptions: { prefix: true, fuzzy: 0.2, boost: { produto: 3, substancia: 2 } },
  });
  mini.addAll([...byId.values()]);
  return { byId, byGrupo, mini, meta };
}

// Reordena os resultados da busca: o que a pessoa veio ver sobe. "De graça" primeiro
// (o melhor desfecho), depois os que têm preço coletado, e por fim o resto (só teto /
// sem nada). A relevância do MiniSearch vira o desempate — sort estável preserva a
// ordem de entrada dentro de cada faixa. Como 98% da base não tem preço, sem isso o
// único resultado útil costuma cair lá embaixo.
export function ordenaPorUtilidade(meds: ClientMed[]): ClientMed[] {
  const faixa = (m: ClientMed) => (m.deGraca ? 0 : menorPreco(m) != null ? 1 : 2);
  return [...meds].sort((a, b) => faixa(a) - faixa(b));
}

// porUtilidade=true (busca da home): sobe quem tem preço/de-graça, reordenando ANTES
// de cortar (um remédio com preço na posição 50 por relevância precisa poder subir e
// caber no limite). Default false = pura relevância — o Colaborar quer achar o remédio
// pra reportar (que muitas vezes NÃO tem preço), então não pode empurrá-lo pra baixo.
export function searchMeds(idx: MedsIndex, q: string, limit = 40, porUtilidade = false): ClientMed[] {
  if (q.trim().length < 2) return [];
  const hits = idx.mini
    .search(q)
    .map((r) => idx.byId.get(String(r.id)))
    .filter((m): m is ClientMed => Boolean(m));
  return (porUtilidade ? ordenaPorUtilidade(hits) : hits).slice(0, limit);
}
