// Normaliza texto: remove acentos e espaco nao-quebravel, colapsa espacos, minusculo.
export function norm(s: unknown): string {
  if (s == null) return "";
  return String(s)
    .replace(/ /g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const SO_TRACO = /^-+$/;

// Campo de texto: trata ausencia ("-", "   -   ", vazio) como null.
export function cleanStr(s: unknown): string | null {
  if (s == null) return null;
  const v = String(s).replace(/ /g, " ").trim();
  if (!v || SO_TRACO.test(v.replace(/\s/g, ""))) return null;
  return v;
}

// EAN/GTIN: string so-digitos (preserva zeros a esquerda). Descarta "-" e nao-numericos.
export function cleanEan(s: unknown): string | null {
  const v = cleanStr(s);
  if (!v) return null;
  const d = v.replace(/\D/g, "");
  return d.length ? d : null;
}

// Preco "27,44" (virgula decimal, as vezes "1.234,56") -> CENTAVOS (inteiro). Ausencia -> null.
export function toCents(s: unknown): number | null {
  if (s == null) return null;
  const raw = String(s).replace(/ /g, " ").trim();
  if (!raw || SO_TRACO.test(raw.replace(/\s/g, ""))) return null;
  const cleaned = raw.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  if (!cleaned || cleaned === ".") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
