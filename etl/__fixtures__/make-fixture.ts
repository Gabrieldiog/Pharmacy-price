import * as XLSX from "xlsx";
import { mkdirSync, writeFileSync } from "node:fs";

// Gera uma mini planilha no formato da CMED (preambulo + cabecalho + 2 linhas) para os
// testes offline rodarem sem rede. Reproduz as pegadinhas reais: preambulo, coluna " ALC",
// preco com virgula, ausencia como "    -     ".
const HEADER = [
  "SUBSTÂNCIA", "CNPJ", "LABORATÓRIO", "CÓDIGO GGREM", "REGISTRO",
  "EAN 1", "EAN 2", "EAN 3", "PRODUTO", "APRESENTAÇÃO",
  "CLASSE TERAPÊUTICA", "TIPO DE PRODUTO", "REGIME DE PREÇO",
  "PMC 0 %", "PMC 12 %", "PMC 17 %", "PMC 19 %", "PMC 19 %  ALC",
  "RESTRIÇÃO HOSPITALAR", "TARJA",
];

const rows: unknown[][] = [
  ["LISTA DE PRECOS DE MEDICAMENTOS - CMED (preambulo)"],
  ["texto legal do preambulo"],
  [],
  HEADER,
  [
    "DIPIRONA MONOIDRATADA", "18.459.628/0001-15", "EMS S/A", "526112010040409",
    "1000000000001", "7891234567890", "    -     ", "    -     ", "DIPIRONA (G)",
    "500 MG COM CT BL AL X 20", "ANALGESICOS E ANTIPIRETICOS", "Genérico", "Regulado",
    "10,50", "11,20", "11,90", "12,34", "13,00", "Não", "Tarja Vermelha",
  ],
  [
    "LOSARTANA POTASSICA", "11.111.111/0001-11", "GEOLAB", "500000000000000",
    "2000000000002", "7890000000005", "", "", "LOSARTANA POTASSICA",
    "50 MG COM CT BL AL X 30", "ANTI-HIPERTENSIVOS", "Similar", "Liberado",
    "8,00", "    -     ", "9,10", "9,90", "10,50", "Não", "Tarja Vermelha",
  ],
];

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Planilha1");

const dir = new URL("./", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const outPath = new URL("./cmed-mini.xlsx", import.meta.url).pathname;
// No ESM o SheetJS nao tem `fs` ligado (writeFile falha); geramos o buffer e gravamos nos.
const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
writeFileSync(outPath, buf);
console.log(`Fixture escrita em ${outPath}`);
