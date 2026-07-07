"use client";

import MiniSearch from "minisearch";
import type { ClientMed, PrecosMeta } from "@/lib/types";

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export interface MedsIndex {
  byId: Map<string, ClientMed>;
  byGrupo: Map<string, ClientMed[]>; // equivalencia: substancia|concentracao -> remedios
  mini: MiniSearch;
  meta: PrecosMeta | null;
}

// menor preco praticado do medicamento (centavos), ou null se nao houver
export function menorPreco(m: ClientMed): number | null {
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

export function searchMeds(idx: MedsIndex, q: string, limit = 40): ClientMed[] {
  if (q.trim().length < 2) return [];
  return idx.mini
    .search(q)
    .slice(0, limit)
    .map((r) => idx.byId.get(String(r.id)))
    .filter((m): m is ClientMed => Boolean(m));
}
