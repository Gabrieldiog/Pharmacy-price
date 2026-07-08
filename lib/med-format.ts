// Formatacao compartilhada entre o card e a pagina de detalhe.

export function brl(cents: number | null): string | null {
  if (cents == null) return null;
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

// "Novo" na CMED = medicamento de referencia (marca original).
export function tipoLabel(tipo: string | null): string | null {
  if (!tipo) return null;
  return tipo.toLowerCase() === "novo" ? "Referência" : tipo;
}

export function tipoClass(tipo: string | null): string {
  const t = (tipo ?? "").toLowerCase();
  if (t === "generico" || t === "genérico") return "tag-generico";
  if (t === "similar") return "tag-similar";
  if (t === "novo") return "tag-referencia";
  return "";
}

// Tarja Preta = medicamento controlado (nao vendido por e-commerce; preco so no balcao).
export function isControlado(tarja: string | null): boolean {
  return /preta/i.test(tarja ?? "");
}

export function ddmm(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// "hoje" / "há N dias" a partir de uma data ISO. O preco ao vivo (NFC-e) tem
// alguns dias de atraso, entao mostrar a idade do dado e questao de honestidade.
export function haQuantoTempo(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "há 1 dia";
  return `há ${dias} dias`;
}
