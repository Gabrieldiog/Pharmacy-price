"use client";

import type { Geo } from "@/lib/geo";

// Cliente do Balcao (gateway de dados publicos, projeto irmao). Cada UF tem uma
// ou mais fontes de preco ao vivo: o Parana vem das notas fiscais (por loja);
// Goias bate em varias redes locais (catalogo online) ao mesmo tempo e mostra a
// mais barata na frente. A UI deixa a natureza do preco clara.

// Base do Balcao. Em producao aponta pro dominio publicado (NEXT_PUBLIC_BALCAO_URL);
// vazio = sem preco ao vivo, e o site cai no fallback honesto sem quebrar.
const BASE = (process.env.NEXT_PUBLIC_BALCAO_URL ?? "").replace(/\/+$/, "");

export interface FonteAoVivo {
  conectores: string[]; // conectores do Balcao consultados em paralelo (/v1/<conector>/produtos)
  titulo: string; // cabecalho do bloco: "Paraná", "Goiânia"
  comoObtido: string; // subtitulo: "das notas fiscais...", "do catálogo online..."
  nota: string; // rodape honesto sobre a natureza do preco
  porLoja: boolean; // true = NFC-e por loja (distancia, mapa); false = e-commerce
}

// UF -> fonte de preco ao vivo. Cresce conforme novas redes/estados entram.
const FONTE_POR_UF: Record<string, FonteAoVivo> = {
  PR: {
    conectores: ["notaparana"],
    titulo: "Paraná",
    comoObtido: "das notas fiscais, da loja mais barata pra mais cara",
    nota: "Preço da última venda vista na nota fiscal — pode ter alguns dias.",
    porLoja: true,
  },
  GO: {
    conectores: ["rosario", "alexfarma", "nissei"],
    titulo: "Goiânia",
    comoObtido: "do catálogo online das redes de Goiânia, do mais barato pro mais caro",
    nota: "Preço do site de cada rede (Rosário, Alexfarma, Nissei), ao vivo e igual em toda a rede — não é de uma loja específica. No balcão da loja pode variar.",
    porLoja: false,
  },
};

export function balcaoConfigurado(): boolean {
  return Boolean(BASE);
}

// A fonte de preco ao vivo dessa UF, ou null (Balcao nao configurado ou UF sem fonte).
export function fonteAoVivo(uf: string): FonteAoVivo | null {
  return BASE ? FONTE_POR_UF[uf] ?? null : null;
}

export function temPrecoAoVivo(uf: string): boolean {
  return fonteAoVivo(uf) != null;
}

export interface PrecoLoja {
  descricao: string;
  valorCents: number;
  estabelecimento: string | null; // nome real da loja, ou null quando a fonte não trouxe
  empresa: string | null;
  bairro: string | null;
  municipio: string | null;
  endereco: string | null;
  distanciaKm: number | null;
  atualizado: string | null; // ISO
}

interface EnvelopeBalcao {
  dados?: Array<Record<string, unknown>>;
}

// A fonte manda o preco como string decimal em formato US ("1.04"). Number()
// entende direto; arredondamos pra centavo pra fugir do ruido de ponto flutuante.
function paraCents(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function mapeia(d: Record<string, unknown>): PrecoLoja | null {
  const valorCents = paraCents(d.valor);
  if (valorCents == null) return null;
  const distancia = Number(d.distancia_km);
  return {
    descricao: texto(d.descricao) ?? "",
    valorCents,
    estabelecimento: texto(d.estabelecimento),
    empresa: texto(d.empresa),
    bairro: texto(d.bairro),
    municipio: texto(d.municipio),
    endereco: texto(d.endereco),
    distanciaKm: Number.isFinite(distancia) ? distancia : null,
    atualizado: texto(d.atualizado),
  };
}

interface Opts {
  raioKm?: number;
  limite?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

// Busca o preco ao vivo do produto, do mais barato pro mais caro. Consulta as
// redes da UF em paralelo e junta; se uma cair, as outras ainda respondem (só
// falha tudo se todas caírem). Fonte por loja (NFC-e) usa geo; e-commerce ignora.
export async function precoAoVivo(
  uf: string,
  termo: string,
  geo: Geo | null,
  opts: Opts = {},
): Promise<PrecoLoja[]> {
  const fonte = fonteAoVivo(uf);
  // tira pontuação que quebra a busca de algumas fontes (ex.: o "+" de
  // "dipirona + cafeína" faz a VTEX responder 400); mantém letra, número e acento
  const q = termo.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  if (!fonte || !q) return [];

  const resultados = await Promise.allSettled(
    fonte.conectores.map((conn) => umaFonte(conn, fonte, q, geo, opts)),
  );
  const ok = resultados.filter((r): r is PromiseFulfilledResult<PrecoLoja[]> => r.status === "fulfilled");
  // se NENHUMA respondeu, propaga o erro pra UI mostrar "erro" (e não "vazio")
  if (ok.length === 0) {
    throw (resultados[0] as PromiseRejectedResult | undefined)?.reason ?? new Error("nenhuma fonte respondeu");
  }
  return ok.flatMap((r) => r.value).sort((a, b) => a.valorCents - b.valorCents);
}

// Consulta um conector do Balcao e devolve os precos (sem ordenar — a juncao ordena).
async function umaFonte(
  conector: string,
  fonte: FonteAoVivo,
  termo: string,
  geo: Geo | null,
  opts: Opts,
): Promise<PrecoLoja[]> {
  const params = new URLSearchParams({ termo });
  if (fonte.porLoja) {
    if (!geo) return []; // preco por loja precisa saber de onde buscar
    params.set("lat", String(geo.lat));
    params.set("lon", String(geo.lng));
    params.set("raio", String(opts.raioKm ?? 15));
  } else {
    params.set("limite", String(opts.limite ?? 12));
  }
  const url = `${BASE}/v1/${conector}/produtos?${params.toString()}`;

  // timeout proprio pra uma fonte lenta nao deixar a UI travada em "carregando";
  // tambem repassamos o abort de quem chamou (desmontar o componente cancela).
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 8000);
  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort();
    else opts.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }

  try {
    const resp = await fetch(url, { signal: ctrl.signal });
    if (!resp.ok) throw new Error(`balcao respondeu ${resp.status}`);
    const corpo = (await resp.json()) as EnvelopeBalcao;
    const itens = Array.isArray(corpo.dados) ? corpo.dados : [];
    return itens.map(mapeia).filter((x): x is PrecoLoja => x != null);
  } finally {
    clearTimeout(timer);
  }
}
