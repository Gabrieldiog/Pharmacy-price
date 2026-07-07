import * as XLSX from "xlsx";
import type { Apresentacao } from "./types";
import { norm, cleanStr, cleanEan, toCents } from "./normalize";

// A planilha da CMED tem ~42 linhas de preambulo antes do cabecalho, e o numero exato
// muda entre edicoes. Em vez de fixar a linha, achamos a que contem "SUBSTANCIA".
function findHeaderRow(rows: unknown[][]): number {
  const max = Math.min(rows.length, 100);
  for (let i = 0; i < max; i++) {
    const r = rows[i];
    if (Array.isArray(r) && r.some((c) => norm(c) === "substancia")) return i;
  }
  return -1;
}

// Colunas de PMC por aliquota de ICMS ("PMC 19 %", "PMC 17,5 %"...). Ignora as variantes
// " ALC" (Zona Franca/Areas de Livre Comercio) e "PMC Sem Impostos".
function mapPmcColumns(rawHeader: unknown[]): Record<string, number> {
  const cols: Record<string, number> = {};
  rawHeader.forEach((cell, i) => {
    const h = norm(cell);
    if (!h.startsWith("pmc") || h.includes("alc")) return;
    const m = h.match(/^pmc\s*([0-9]+(?:[.,][0-9]+)?)\s*%?$/);
    if (m) cols[m[1]!.replace(",", ".")] = i;
  });
  return cols;
}

export function parseCmedBuffer(buf: Uint8Array | Buffer, vigencia: string): Apresentacao[] {
  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Arquivo CMED sem planilhas.");
  const sheet = wb.Sheets[sheetName]!;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: null });

  const hIdx = findHeaderRow(rows);
  if (hIdx < 0) throw new Error('Cabecalho da CMED nao encontrado (nenhuma linha com "SUBSTANCIA").');
  const raw = rows[hIdx]!;
  const header = raw.map((c) => norm(c));

  const find = (pred: (h: string) => boolean) => header.findIndex(pred);
  const col = {
    substancia: find((h) => h === "substancia"),
    cnpj: find((h) => h === "cnpj"),
    laboratorio: find((h) => h === "laboratorio"),
    ggrem: find((h) => h.includes("ggrem")),
    registro: find((h) => h === "registro"),
    ean1: find((h) => h === "ean 1"),
    ean2: find((h) => h === "ean 2"),
    ean3: find((h) => h === "ean 3"),
    produto: find((h) => h === "produto"),
    apresentacao: find((h) => h.startsWith("apresenta")),
    classe: find((h) => h.includes("classe terapeutica")),
    tipo: find((h) => h.includes("tipo de produto")),
    regime: find((h) => h.includes("regime de preco")),
    tarja: find((h) => h === "tarja"),
    restricao: find((h) => h.includes("restricao hospitalar")),
  };
  const pmcCols = mapPmcColumns(raw);
  if (Object.keys(pmcCols).length === 0) throw new Error("Nenhuma coluna de PMC por aliquota encontrada.");

  const at = (r: unknown[], i: number): unknown => (i >= 0 ? r[i] : null);
  const out: Apresentacao[] = [];
  for (let i = hIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!Array.isArray(r)) continue;
    const ggrem = cleanStr(at(r, col.ggrem));
    const produto = cleanStr(at(r, col.produto));
    const substancia = cleanStr(at(r, col.substancia));
    if (!ggrem && !produto && !substancia) continue; // linha em branco / rodape

    const pmc: Record<string, number | null> = {};
    for (const [aliq, idx] of Object.entries(pmcCols)) pmc[aliq] = toCents(r[idx]);

    const eans = [at(r, col.ean1), at(r, col.ean2), at(r, col.ean3)]
      .map(cleanEan)
      .filter((e): e is string => e !== null);

    out.push({
      ggrem,
      registro: cleanStr(at(r, col.registro)),
      substancia,
      produto,
      laboratorio: cleanStr(at(r, col.laboratorio)),
      cnpj: cleanStr(at(r, col.cnpj)),
      apresentacao: cleanStr(at(r, col.apresentacao)),
      classe_terapeutica: cleanStr(at(r, col.classe)),
      tipo: cleanStr(at(r, col.tipo)),
      tarja: cleanStr(at(r, col.tarja)),
      regime: cleanStr(at(r, col.regime)),
      restricao_hospitalar: cleanStr(at(r, col.restricao)),
      eans,
      pmc,
      vigencia,
    });
  }
  return out;
}
