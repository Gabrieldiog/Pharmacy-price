import type { Apresentacao } from "./types";

// Registro enxuto que vai pro cliente (o app carrega isso e indexa com MiniSearch).
export interface AppMed {
  id: string; // slug + ggrem (unico)
  slug: string;
  ggrem: string;
  ean: string | null;
  eans: string[];
  produto: string;
  substancia: string | null;
  laboratorio: string | null;
  apresentacao: string | null;
  concentracao: string | null;
  tipo: string | null;
  tarja: string | null;
  classe: string | null;
  grupo: string; // substancia|concentracao normalizados (equivalencia)
  semTeto: boolean; // regime "Liberado"
  deGraca: boolean;
  pfpbIndicacao: string | null;
  pmc: Record<string, number | null>; // teto por aliquota, em centavos
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

export function slugify(s: string): string {
  return semAcento(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

// Primeira dose da apresentacao: "500 MG", "50 MG", "100 MG/ML", "0,05 MG"...
// Usada no slug (id estavel) — nao mexer sem migrar os ids.
export function extractConcentracao(apresentacao: string | null): string | null {
  if (!apresentacao) return null;
  const m = apresentacao.match(/\b\d+(?:[.,]\d+)?\s?(?:MG|MCG|G|UI|%)(?:\s?\/\s?ML)?\b/i);
  return m ? m[0].replace(/\s+/g, " ").toUpperCase() : null;
}

// unidades: as por volume aceitam denominador com numero ("MG/5 ML", nao so "MG/ML"),
// senao a dose de xarope perderia o "/5ML" (e o 2o ativo, no combo)
const UNIDADE = "MG\\s*\\/\\s*\\d*\\s*ML|MCG\\s*\\/\\s*\\d*\\s*ML|G\\s*\\/\\s*\\d*\\s*ML|UI\\s*\\/\\s*\\d*\\s*ML|MG\\s*\\/\\s*G|MCG\\s*\\/\\s*G|MG|MCG|UI|G|%";
const DOSE_UNA = `\\d+(?:[.,]\\d+)?\\s*(?:${UNIDADE})`;
const RE_DOSE_LEAD = new RegExp(`^\\s*(?:${DOSE_UNA})(?:\\s*\\+\\s*(?:${DOSE_UNA}))*`, "i");

// TODAS as doses da apresentacao, legivel ("5 MG + 50 MG", "0,45 MG + 20 MG",
// "10 MG/G + 0,443 MG/G"). Isso conserta a dose truncada dos combos (antes so a 1a
// dose aparecia). So le a secao de dose no inicio, pra nao pegar o tamanho da
// embalagem ("... X 40 G"). Trata o formato entre parenteses da CMED — "(0,035 + 2)
// MG" vira "0,035 MG + 2 MG". Fallback: a primeira dose, quando nao da pra ler.
export function doseCompleta(apresentacao: string | null): string | null {
  if (!apresentacao) return null;
  // "(0,035 + 2) MG" -> "0,035 MG + 2 MG": distribui a unidade que vem depois do ")"
  const ap = apresentacao
    .toUpperCase()
    .replace(/\(([^)]*?)\)\s*(MG\s*\/\s*ML|MG\s*\/\s*G|MCG|MG|UI|G|%)/gi, (todo, dentro, uni) => {
      const partes = String(dentro).split("+").map((p) => p.trim()).filter(Boolean);
      if (partes.length < 2 || partes.some((p) => !/^\d/.test(p))) return todo;
      return partes.map((p) => `${p} ${uni}`).join(" + ");
    });
  const m = RE_DOSE_LEAD.exec(ap);
  if (!m) return extractConcentracao(apresentacao);
  return m[0]
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*\+\s*/g, " + ")
    .replace(/\s+/g, " ")
    .trim();
}

// Categoria da forma farmaceutica, larga o bastante pra nao fragmentar (comprimido
// e capsula = "oralsol"), mas separando o que NAO e intercambiavel: injetavel,
// topico, supositorio/vaginal, oftalmico etc. A ordem importa (INJ antes de SOL;
// CAP antes de GEL, senao "CAP GEL" viraria topico). Desconhecido vira "outro:<token>"
// (so agrupa com forma identica — mais restrito, mais seguro).
export function formaBucket(apresentacao: string | null): string {
  const full = (apresentacao ?? "").toUpperCase();
  // tira a secao de dose do inicio pra sobrar a forma (senao o fallback pegaria "MG")
  const ap = full.replace(RE_DOSE_LEAD, "").trim() || full;
  if (/\bINJ\b|LIOF|\bSER\b|DEPOT|CARP|INFUS/.test(ap)) return "inj";
  if (/\bOFT\b|COLIR/.test(ap)) return "oft";
  if (/\bAUR\b|NASAL|\bNAS\b/.test(ap)) return "nasoauric";
  if (/\bSUP\b|OVULO|\bVAG\b|\bRET\b/.test(ap)) return "retovag";
  if (/INAL|AEROSS|\bAER\b|SPRAY|\bNEB\b/.test(ap)) return "inal";
  if (/ADES|TRANSD/.test(ap)) return "transd";
  if (/\bCOMP?\b|\bCAP\b|\bDRG\b|\bPAST\b|GOMA|\bTABL|GRAN/.test(ap)) return "oralsol";
  if (/CREM|\bPOM\b|\bGEL\b|\bLOC\b|LOÇ|DERM|\bTOP\b|XAMP|SHAMP|\bSAB\b|\bESM\b/.test(ap)) return "topico";
  if (/\bSOL\b|\bSUS\b|XPE|XAR|\bGOT\b|\bGTS\b|EMULS|ELIX|\bELX\b|\bXPO\b|\bPO\b/.test(ap)) return "oralliq";
  const tok = ap.match(/[A-Z]{2,}/);
  return `outro:${tok ? tok[0].toLowerCase() : "?"}`;
}

// Perfil de liberacao: "lp" (prolongada/controlada/modificada, XR) separa do comum.
// Trocar liberacao normal por prolongada muda o regime de dose — nao sao a mesma coisa.
export function liberacao(apresentacao: string | null): string {
  // "AP" = acao prolongada (CAP AP, FLUXTAR/nimesulida); na base so aparece em
  // liberacao modificada, entao e seguro separar do comum.
  return /LIB(?:ERACAO)?\s*(?:PROL|CONTROL|MODIF|RETARD|OSM|EXT|ASSIM)|\bXR\b|RETARD|\bAP\b/i.test(apresentacao ?? "")
    ? "lp"
    : "";
}

// Chave de equivalencia: so agrupa o que e de fato intercambiavel — mesmo principio
// ativo + mesma dose COMPLETA + mesma forma farmaceutica + mesmo perfil de liberacao.
// Antes era so substancia+1a dose, o que juntava Glifage XR (prolongada) com metformina
// comum, injetavel com comprimido, e combos de doses diferentes. Normaliza a substancia
// forte pra nao fragmentar por grafia ("tri-hidratada" = "trihidratada").
export function grupoKey(substancia: string | null, apresentacao: string | null): string {
  const s = semAcento(substancia ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  // dose normalizada, na ORDEM da apresentacao (NAO ordena): num combo as forcas nao
  // sao intercambiaveis entre os ativos — bisoprolol 5/anlodipino 10 != bisoprolol
  // 10/anlodipino 5. Ordenar apagaria essa diferenca e juntaria os dois como "troca
  // segura". O custo e nao juntar mesma-formula-de-ordem-trocada (under-merge, seguro).
  const dose = (doseCompleta(apresentacao) ?? "")
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/[^a-z0-9.+/]/g, "");
  return `${s}|${dose}|${formaBucket(apresentacao)}|${liberacao(apresentacao)}`;
}

export function toAppMed(a: Apresentacao, deGraca: boolean, pfpbIndicacao: string | null): AppMed {
  // o slug (parte do id) usa a 1a dose pra manter o id estavel; o campo concentracao
  // usa a dose completa (mostra o combo inteiro e alimenta a chave de equivalencia)
  const doseSlug = extractConcentracao(a.apresentacao);
  const concentracao = doseCompleta(a.apresentacao);
  const slug = slugify(`${a.produto ?? a.substancia ?? "medicamento"} ${doseSlug ?? ""}`);
  return {
    id: `${slug}-${a.ggrem ?? ""}`.replace(/-+$/g, ""),
    slug,
    ggrem: a.ggrem ?? "",
    ean: a.eans[0] ?? null,
    eans: a.eans,
    produto: a.produto ?? "",
    substancia: a.substancia,
    laboratorio: a.laboratorio,
    apresentacao: a.apresentacao,
    concentracao,
    tipo: a.tipo,
    tarja: a.tarja,
    classe: a.classe_terapeutica,
    grupo: grupoKey(a.substancia, a.apresentacao),
    semTeto: (a.regime ?? "").toLowerCase().includes("liberado"),
    deGraca,
    pfpbIndicacao,
    pmc: a.pmc,
  };
}
