"use client";

import MiniSearch from "minisearch";
import type { ClientMed, PrecosMeta } from "@/lib/types";
import { formaBase, isControlado } from "@/lib/med-format";

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

// Carrega a base do cliente e monta o indice de busca uma unica vez por sessao.
// Cacheado: agora cada remedio e uma rota propria, entao navegar entre eles nao
// pode re-baixar e reconstruir os 8,9 MB toda vez. Reusado pela home (Search),
// pela pagina de remedio e pela de colaboracao.
let indexCache: Promise<MedsIndex> | null = null;

export function loadMedsIndex(): Promise<MedsIndex> {
  if (!indexCache) {
    indexCache = construirIndice().catch((e) => {
      indexCache = null; // falha de rede nao fica grudada: permite nova tentativa
      throw e;
    });
  }
  return indexCache;
}

async function construirIndice(): Promise<MedsIndex> {
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

// o "melhor" membro de um grupo pra representar o card: de graça primeiro, senão o
// mais barato com preço, senão o primeiro (mais relevante, já que a lista vem ordenada)
function melhorMembro(membros: ClientMed[]): ClientMed {
  const gratis = membros.find((m) => m.deGraca);
  if (gratis) return gratis;
  let melhor = membros[0]!;
  let melhorPreco = menorPreco(melhor) ?? Infinity;
  for (const m of membros) {
    const p = menorPreco(m) ?? Infinity;
    if (p < melhorPreco) {
      melhor = m;
      melhorPreco = p;
    }
  }
  return melhor;
}

export interface GrupoResultado {
  rep: ClientMed; // o card que aparece
  total: number; // quantas apresentações/marcas caíram nesse grupo
}

// Agrupa a lista de busca por REMÉDIO — mesmo produto + mesma dose + mesma forma. Junta
// as N marcas/embalagens da mesma dipirona genérica num card só ("a partir de R$X · +N
// opções"), mas mantém Novalgina separada da dipirona, e formas diferentes cada uma no
// seu card. A chave usa o grupo (substância+dose+liberação) MAIS a formaBase, porque o
// bucket de forma do grupo é largo (junta comprimido com cápsula, creme com pomada).
// Preserva a ordem de entrada: o grupo aparece na posição do seu 1º membro (o mais útil).
export function agrupaResultados(meds: ClientMed[]): GrupoResultado[] {
  const grupos = new Map<string, ClientMed[]>();
  const ordem: string[] = [];
  for (const m of meds) {
    const chave = m.grupo ? `${norm(m.produto)}|${m.grupo}|${formaBase(m.apresentacao) ?? ""}` : `solo:${m.id}`;
    let arr = grupos.get(chave);
    if (!arr) {
      arr = [];
      grupos.set(chave, arr);
      ordem.push(chave);
    }
    arr.push(m);
  }
  return ordem.map((chave) => {
    const membros = grupos.get(chave)!;
    return { rep: melhorMembro(membros), total: membros.length };
  });
}

export interface NudgeGenerico {
  id: string;
  produto: string;
  centavos: number;
}

// Pro card de uma marca (ou similar) COM PREÇO e um genérico equivalente MAIS BARATO:
// aponta pra ele. É o coração da promessa ("o mesmo remédio, muito mais barato") onde a
// decisão acontece. Só quando faz sentido de verdade:
//  - o próprio não pode ser genérico nem de graça (não vai mandar pagar pelo que é grátis);
//  - o próprio precisa ter preço-base (senão não dá pra afirmar "mais barato");
//  - a economia tem que ser relevante (>= R$3 OU >= 20%), pra "bem mais barato" ser honesto.
const ehGenerico = (m: ClientMed) => /gen[eé]rico/i.test(m.tipo ?? "");
const ECONOMIA_MIN_CENTAVOS = 300;
const ECONOMIA_MIN_FRACAO = 0.2;

export function genericoMaisBarato(idx: MedsIndex, med: ClientMed): NudgeGenerico | null {
  if (!med.grupo || ehGenerico(med) || med.deGraca) return null;
  const precoMed = menorPreco(med);
  if (precoMed == null) return null;
  let melhor: NudgeGenerico | null = null;
  let melhorPreco = precoMed;
  for (const m of idx.byGrupo.get(med.grupo) ?? []) {
    if (!ehGenerico(m)) continue;
    const p = menorPreco(m);
    if (p == null || p >= melhorPreco) continue;
    melhor = { id: m.id, produto: m.produto, centavos: p };
    melhorPreco = p;
  }
  if (!melhor) return null;
  const economia = precoMed - melhor.centavos;
  if (economia < ECONOMIA_MIN_CENTAVOS && economia / precoMed < ECONOMIA_MIN_FRACAO) return null;
  return melhor;
}
