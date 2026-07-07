import { isValidEan13 } from "./ean";

export interface PfpbItem {
  ean: string;
  produto: string; // principio ativo + dosagem (medicamentos do PFPB nao tem marca)
  indicacao: string;
  eanValido: boolean;
  mesReferencia: string;
}

// A indicacao e um vocabulario fechado que aparece no FIM do "PRODUTO INDICACAO".
// A forma longa "DIABETES MELLITUS + DOENCA CARDIOVASCULAR" vem antes de "DIABETES"
// para casar a mais especifica primeiro.
const INDICACAO =
  /(ANTICONCEP[ÇC][ÃA]O|HIPERTENS[ÃA]O|DIABETES MELLITUS \+ DOEN[ÇC]A CARDIOVASCULAR|DIABETES|DISLIPIDEMIA|ASMA|OSTEOPOROSE|GLAUCOMA|RINITE|DOEN[ÇC]A DE PARKINSON|PARKINSON)\s*$/i;

// O texto extraido do PDF e um fluxo unico de "PRODUTO INDICACAO EAN13", repetido por EAN.
// Cada registro termina num EAN-13; o texto antes dele e "PRODUTO ... INDICACAO".
export function parsePfpbText(text: string, mesReferencia: string): PfpbItem[] {
  const clean = text
    .replace(/P[áa]gina \d+ de \d+/gi, " ")
    .replace(/PRODUTO\s+INDICA[ÇC][ÃA]O\s+C[ÓO]DIGO DE BARRAS/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const re = /(.+?)(\d{13})/g;
  const items: PfpbItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const chunk = m[1]!.trim();
    const ean = m[2]!;

    let indicacao = "";
    let produto = chunk;
    const ind = chunk.match(INDICACAO);
    if (ind && ind.index !== undefined) {
      indicacao = ind[1]!.replace(/\s+/g, " ").trim().toUpperCase();
      produto = chunk.slice(0, ind.index).trim();
    }
    produto = produto.replace(/\s+/g, " ");
    if (!produto) continue;

    items.push({ ean, produto, indicacao, eanValido: isValidEan13(ean), mesReferencia });
  }
  return items;
}
