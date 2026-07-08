"use client";

import type { Geo } from "@/lib/geo";

// Cliente do Balcao (gateway de dados publicos, projeto irmao). O preco ao vivo
// vem das notas fiscais (NFC-e) que alguns estados publicam por loja. Hoje so o
// Parana tem essa fonte aberta; Goias (piloto) ainda nao, entao la o preco de
// balcao entra por colaboracao. Quando um estado novo abrir, e so mapear aqui.

// Base do Balcao. Em producao aponta pro dominio publicado (NEXT_PUBLIC_BALCAO_URL);
// vazio = sem preco ao vivo, e o site cai no fallback honesto sem quebrar.
const BASE = (process.env.NEXT_PUBLIC_BALCAO_URL ?? "").replace(/\/+$/, "");

// UF -> nome do conector no Balcao. So cresce quando um estado novo publica NFC-e.
const FONTE_POR_UF: Record<string, string> = { PR: "notaparana" };

export function balcaoConfigurado(): boolean {
  return Boolean(BASE);
}

// Tem como mostrar preco ao vivo nessa UF? Precisa do Balcao configurado e de
// uma fonte pra UF.
export function temPrecoAoVivo(uf: string): boolean {
  return Boolean(BASE) && uf in FONTE_POR_UF;
}

export interface PrecoLoja {
  descricao: string;
  valorCents: number;
  estabelecimento: string;
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
    estabelecimento: texto(d.estabelecimento) ?? "Farmácia",
    empresa: texto(d.empresa),
    bairro: texto(d.bairro),
    municipio: texto(d.municipio),
    endereco: texto(d.endereco),
    distanciaKm: Number.isFinite(distancia) ? distancia : null,
    atualizado: texto(d.atualizado),
  };
}

// Busca o preco praticado por loja perto de `geo`, do mais barato pro mais caro.
// Retorna [] quando nao ha fonte pra UF ou o Balcao nao esta configurado.
export async function precoAoVivo(
  uf: string,
  termo: string,
  geo: Geo,
  opts: { raioKm?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<PrecoLoja[]> {
  const fonte = FONTE_POR_UF[uf];
  if (!BASE || !fonte || !termo.trim()) return [];

  const url =
    `${BASE}/v1/${fonte}/produtos` +
    `?termo=${encodeURIComponent(termo.trim())}` +
    `&lat=${geo.lat}&lon=${geo.lng}&raio=${opts.raioKm ?? 15}`;

  // timeout proprio pra um Balcao lento nao deixar a UI travada em "carregando";
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
    return itens
      .map(mapeia)
      .filter((x): x is PrecoLoja => x != null)
      .sort((a, b) => a.valorCents - b.valorCents);
  } finally {
    clearTimeout(timer);
  }
}
