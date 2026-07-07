// Valida o digito verificador de um EAN-13 (GTIN-13). Alguns EANs do PFPB usam prefixo
// nao-BR (ex.: 5000456) — isso e valido, so o check digit importa.
export function isValidEan13(ean: string): boolean {
  if (!/^\d{13}$/.test(ean)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(ean[i]) * (i % 2 === 0 ? 1 : 3);
  const check = (10 - (sum % 10)) % 10;
  return check === Number(ean[12]);
}
