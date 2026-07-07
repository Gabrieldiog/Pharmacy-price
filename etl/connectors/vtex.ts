// Conector VTEX generico (parametrizado por host). Muitas redes de farmacia rodam VTEX
// e expoem o catalogo publico sem auth. Preco vem do catalogo (Price em reais).
export const VTEX_UA = "Pharmacy-price/0.1 (+https://github.com/Gabrieldiog/Pharmacy-price)";

export interface VtexProduct {
  ean: string | null;
  produto: string;
  marca: string | null;
  precoCentavos: number | null;
  listaCentavos: number | null;
  disponivel: boolean;
  itemId: string | null;
}

export interface PickupPoint {
  id: string;
  nome: string | null;
  endereco: string;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  lat: number | null;
  lng: number | null;
}

function reaisToCents(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) : null;
}

// Parsers puros (testaveis offline), separados do fetch.
export function parseVtexProducts(raw: unknown): VtexProduct[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p: any): VtexProduct => {
    const item = p?.items?.[0];
    const offer = item?.sellers?.[0]?.commertialOffer;
    return {
      ean: item?.ean ?? null,
      produto: p?.productName ?? "",
      marca: p?.brand ?? null,
      precoCentavos: reaisToCents(offer?.Price),
      listaCentavos: reaisToCents(offer?.ListPrice),
      disponivel: (offer?.AvailableQuantity ?? 0) > 0,
      itemId: item?.itemId ?? null,
    };
  });
}

export function parsePickupPoints(raw: unknown): PickupPoint[] {
  const arr = Array.isArray(raw) ? raw : ((raw as any)?.items ?? (raw as any)?.pickupPoints ?? []);
  if (!Array.isArray(arr)) return [];
  return arr.map((it: any): PickupPoint => {
    // a resposta envelopa cada ponto em { distance, pickupPoint: {...} }
    const pp = it?.pickupPoint ?? it;
    const a = pp?.address ?? pp?.pickupStoreInfo?.address ?? {};
    const geo = Array.isArray(a?.geoCoordinates) ? a.geoCoordinates : [];
    return {
      id: pp?.id ?? "",
      nome: pp?.name ?? pp?.friendlyName ?? null,
      endereco: [a?.street, a?.number].filter(Boolean).join(", "),
      bairro: a?.neighborhood ?? null,
      cidade: a?.city ?? null,
      uf: a?.state ?? null,
      lng: typeof geo[0] === "number" ? geo[0] : null,
      lat: typeof geo[1] === "number" ? geo[1] : null,
    };
  });
}

async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url, { headers: { "User-Agent": VTEX_UA, Accept: "application/json" } });
  if (!r.ok) return null;
  try {
    return await r.json();
  } catch {
    return null;
  }
}

export async function vtexSearchByTerm(host: string, term: string, limit = 20): Promise<VtexProduct[]> {
  const url = `https://${host}/api/catalog_system/pub/products/search/${encodeURIComponent(term)}?_from=0&_to=${limit - 1}`;
  return parseVtexProducts(await getJson(url));
}

export async function vtexPickupPoints(host: string, lat: number, lng: number): Promise<PickupPoint[]> {
  // geoCoordinates e "longitude;latitude" (invertido!)
  const url = `https://${host}/api/checkout/pub/pickup-points?geoCoordinates=${lng};${lat}`;
  return parsePickupPoints(await getJson(url));
}
