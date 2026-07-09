// Extrai a dose (concentracao) de um texto e a normaliza pra uma forma comparavel.
// Serve pra nao misturar apresentacoes diferentes no preco ao vivo: a busca por
// nome ("Sinvastatina") volta 10mg, 20mg e 40mg juntos, e um 10mg barato nao pode
// se passar pelo "menor preco" de uma pagina que e sobre a de 40mg.
//
// Entra tanto o campo `concentracao` da base ("40 MG", "500 MG/ML", "2,5 MG")
// quanto uma descricao livre de produto do catalogo/nota ("Sinvastatina 40mg 30
// Comprimidos - Generico - Ems"). Sai a forma canonica ("40mg", "500mg/ml",
// "2.5mg") ou null quando nao da pra identificar a dose.

// unidades da mais especifica pra mais generica (mg/ml antes de mg, senao "mg/ml"
// casaria so como "mg"). Toleram espaco em volta da barra porque a base tem
// "5 MG / ML", "500 MG/ ML" etc. A quantidade da caixa ("30 Comprimidos") nao
// tem unidade, entao nao entra.
const UNIDADES = "mg\\s*\\/\\s*ml|mcg\\s*\\/\\s*ml|g\\s*\\/\\s*ml|ui\\s*\\/\\s*ml|mg|mcg|g|ml|ui|%";
const RE_DOSE = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${UNIDADES})`, "gi");

function canon(m: RegExpMatchArray): string | null {
  const num = m[1];
  const uni = m[2];
  if (!num || !uni) return null;
  return `${num.replace(",", ".")}${uni.toLowerCase().replace(/\s+/g, "")}`;
}

export function doseCanonica(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const todas = [...texto.matchAll(RE_DOSE)];
  if (todas.length === 0) return null;
  // prefere a dose com unidade de massa (mg/mcg/g, inclusive .../ml) sobre volume
  // puro (ml): "Gotas 20ml Dipirona 500mg/ml" e 500mg/ml, nao 20ml.
  const massa = todas.find((m) => /g/i.test(m[2] ?? ""));
  return canon(massa ?? todas[0]!);
}

// Separa os precos ao vivo pela dose da pagina. Quando da pra identificar a dose
// (concentracao) e existe pelo menos um item com ela, devolve SO esses — assim o
// "menor preco" ao vivo fica comparavel com a pagina, sem um 10mg barato se passar
// por 40mg. Se nao da pra identificar a dose, ou nenhum item bate, devolve todos e
// marca `filtrando: false` (a UI avisa que a lista pode misturar apresentacoes).
export function filtraPorDose<T extends { descricao: string }>(
  itens: T[],
  concentracao: string | null | undefined,
): { itens: T[]; filtrando: boolean; dose: string | null } {
  const dose = doseCanonica(concentracao);
  if (!dose) return { itens, filtrando: false, dose: null };
  const mesma = itens.filter((i) => doseCanonica(i.descricao) === dose);
  return mesma.length > 0 ? { itens: mesma, filtrando: true, dose } : { itens, filtrando: false, dose };
}
