import { UA } from "./scrape-link";

// Farmacia Popular (PFPB): a lista oficial com EAN sai em PDF MENSAL, sem API.
// Pastas por ano em .../codigos-de-barras/{ano}; raspamos o link mais recente.
const BASE = "https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular/codigos-de-barras";
const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

export interface PfpbLink {
  url: string;
  mesReferencia: string; // AAAA-MM
}

export async function scrapePfpbMedicamentosLink(anos: number[] = [2026, 2025]): Promise<PfpbLink> {
  const achados: { url: string; y: number; m: number }[] = [];
  for (const ano of anos) {
    const res = await fetch(`${BASE}/${ano}`, { headers: { "User-Agent": UA } });
    if (!res.ok) continue;
    const html = await res.text();
    const re = /href="([^"]*lista-de-medicamentos-ean-([a-z]+)-(\d{4})\.pdf[^"]*)"/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const mes = MESES[m[2]!.toLowerCase()];
      if (!mes) continue;
      let url = m[1]!.replace(/&amp;/g, "&").replace(/\/view\/?$/, "");
      if (url.startsWith("/")) url = "https://www.gov.br" + url;
      achados.push({ url, y: Number(m[3]), m: mes });
    }
  }
  if (achados.length === 0) throw new Error("Nenhum PDF 'lista-de-medicamentos-ean-*' encontrado (a pagina mudou?).");
  achados.sort((a, b) => b.y - a.y || b.m - a.m);
  const top = achados[0]!;
  return { url: top.url, mesReferencia: `${top.y}-${String(top.m).padStart(2, "0")}` };
}
