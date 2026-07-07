export const UA = "Pharmacy-price-ETL/0.1 (+https://github.com/Gabrieldiog/Pharmacy-price)";
const PAGINA = "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos";

export interface CmedLink {
  url: string;
  filename: string;
  vigencia: string; // AAAA-MM extraido do nome do arquivo
}

// O nome do arquivo tem um timestamp de upload imprevisivel
// (xls_conformidade_site_AAAAMMDD_HHMMSSmmm.xlsx), entao NUNCA montamos a URL as cegas:
// raspamos o link vigente da propria pagina da Anvisa.
export async function scrapeCmedLink(): Promise<CmedLink> {
  const res = await fetch(PAGINA, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Pagina CMED respondeu HTTP ${res.status}`);
  const html = await res.text();

  const m = html.match(/href="([^"]*xls_conformidade_site_(\d{8})_\d+\.xlsx[^"]*)"/i);
  if (!m) throw new Error("Link 'xls_conformidade_site_*.xlsx' nao encontrado (a pagina mudou?).");

  let url = m[1]!.replace(/&amp;/g, "&");
  if (url.startsWith("/")) url = "https://www.gov.br" + url;
  if (!/@@download\/file\/?$/.test(url)) {
    url = url.replace(/(xls_conformidade_site_\d{8}_\d+\.xlsx).*/i, "$1") + "/@@download/file";
  }
  const filename = url.match(/xls_conformidade_site_\d{8}_\d+\.xlsx/i)![0];
  const ymd = m[2]!;
  return { url, filename, vigencia: `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}` };
}
