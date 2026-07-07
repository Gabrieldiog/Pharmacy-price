"use client";

import MiniSearch from "minisearch";
import type { ClientMed, PrecosMeta } from "@/lib/types";

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export interface MedsIndex {
  byId: Map<string, ClientMed>;
  mini: MiniSearch;
  meta: PrecosMeta | null;
}

// Carrega a base do cliente e monta o indice de busca uma unica vez.
// Reusado pela home (Search) e pela pagina de colaboracao.
export async function loadMedsIndex(): Promise<MedsIndex> {
  const [data, meta] = await Promise.all([
    fetch("/medicamentos-go.json").then((r) => r.json()) as Promise<ClientMed[]>,
    fetch("/precos-meta.json").then((r) => r.json()).catch(() => null) as Promise<PrecosMeta | null>,
  ]);
  const byId = new Map<string, ClientMed>();
  for (const med of data) byId.set(med.id, med);
  const mini = new MiniSearch({
    idField: "id",
    fields: ["produto", "substancia"],
    processTerm: norm,
    searchOptions: { prefix: true, fuzzy: 0.2, boost: { produto: 3, substancia: 2 } },
  });
  mini.addAll([...byId.values()]);
  return { byId, mini, meta };
}

export function searchMeds(idx: MedsIndex, q: string, limit = 40): ClientMed[] {
  if (q.trim().length < 2) return [];
  return idx.mini
    .search(q)
    .slice(0, limit)
    .map((r) => idx.byId.get(String(r.id)))
    .filter((m): m is ClientMed => Boolean(m));
}
