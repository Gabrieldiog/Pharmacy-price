// Leitura da chave de acesso da NFC-e (44 digitos) que vem no QR da nota.
// Nao da pra puxar os itens da SEFAZ pelo navegador (CORS), entao a chave serve
// de comprovante: validamos o formato, o digito verificador e a UF (Goias).
//
// Estrutura da chave: cUF(2) AAMM(4) CNPJ(14) modelo(2) serie(3) numero(9)
// tpEmis(1) cNF(8) cDV(1). Modelo 65 = NFC-e; cUF 52 = Goias.

export const UF_POR_CODIGO: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP",
  "17": "TO", "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB",
  "26": "PE", "27": "AL", "28": "SE", "29": "BA", "31": "MG", "32": "ES",
  "33": "RJ", "35": "SP", "41": "PR", "42": "SC", "43": "RS", "50": "MS",
  "51": "MT", "52": "GO", "53": "DF",
};

// Digito verificador da chave: modulo 11, pesos 2..9 ciclando da direita p/ esquerda.
export function mod11ChaveDv(dezenas43: string): number {
  let peso = 2;
  let soma = 0;
  for (let i = dezenas43.length - 1; i >= 0; i--) {
    soma += Number(dezenas43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto === 0 || resto === 1 ? 0 : 11 - resto;
}

export interface ChaveNfce {
  chave: string;
  cUF: string;
  uf: string | null;
  ano: number;
  mes: number;
  cnpj: string;
  modelo: string;
  isNfce: boolean;
  isGoias: boolean;
  dvOk: boolean;
  valido: boolean; // 44 digitos com digito verificador correto
}

export function decodeChaveNfce(chave: string): ChaveNfce | null {
  const d = (chave ?? "").replace(/\D/g, "");
  if (d.length !== 44) return null;
  const cUF = d.slice(0, 2);
  const modelo = d.slice(20, 22);
  const dvOk = mod11ChaveDv(d.slice(0, 43)) === Number(d[43]);
  return {
    chave: d,
    cUF,
    uf: UF_POR_CODIGO[cUF] ?? null,
    ano: 2000 + Number(d.slice(2, 4)),
    mes: Number(d.slice(4, 6)),
    cnpj: d.slice(6, 20),
    modelo,
    isNfce: modelo === "65",
    isGoias: cUF === "52",
    dvOk,
    valido: dvOk,
  };
}

// Aceita a chave crua (com/sem espacos) ou o link do QR da nota (param ?p=CHAVE|...).
export function parseNfceInput(raw: string): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const pMatch = s.match(/[?&]p=([^&#]+)/i);
  if (pMatch?.[1]) {
    const chave = decodeURIComponent(pMatch[1]).split("|")[0]?.replace(/\D/g, "") ?? "";
    if (chave.length === 44) return chave;
  }
  const digits = s.replace(/\D/g, "");
  if (digits.length === 44) return digits;
  const run = digits.match(/\d{44}/);
  return run ? run[0] : null;
}

export function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "").padStart(14, "0");
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}
