export type UF =
  | "AC" | "AL" | "AP" | "AM" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA"
  | "MG" | "MS" | "MT" | "PA" | "PB" | "PE" | "PI" | "PR" | "RJ" | "RN"
  | "RO" | "RR" | "RS" | "SC" | "SE" | "SP" | "TO";

// Aliquota de ICMS (em %) usada para escolher a coluna de PMC da CMED como teto.
// A chave DEVE bater com uma coluna da planilha ("0","12","17","17.5","19","19.5","20","20.5","21","22","22.5","23").
//
// GO = "19" e CONFIRMADO (Lei 22.460/2023, vigente desde 01/04/2024) — a cidade-piloto.
// As demais sao um ponto de partida (modal) e PRECISAM ser validadas contra SEFAZ/CONFAZ
// antes de virar "verdade de produto". Como o ETL emite TODAS as colunas de PMC, corrigir
// este mapa nao exige reprocessar os dados. Ver docs/fontes.md.
export const ALIQUOTA_ICMS: Record<UF, string> = {
  GO: "19", // confirmado
  AC: "19", AL: "20", AP: "18", AM: "20", BA: "20.5", CE: "20", DF: "20",
  ES: "17", MA: "23", MG: "18", MS: "17", MT: "17", PA: "19", PB: "20",
  PE: "20.5", PI: "22.5", PR: "19.5", RJ: "22", RN: "20", RO: "19.5",
  RR: "20", RS: "17", SC: "17", SE: "20", SP: "18", TO: "20",
};

// Teto (em centavos) para uma UF, a partir do mapa de PMC por aliquota. Fallback: coluna 0%.
export function pmcParaUF(pmc: Record<string, number | null>, uf: UF): number | null {
  const v = pmc[ALIQUOTA_ICMS[uf]];
  return v != null ? v : pmc["0"] ?? null;
}
