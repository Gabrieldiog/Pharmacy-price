// Formatacao compartilhada entre o card e a pagina de detalhe.

export function brl(cents: number | null): string | null {
  if (cents == null) return null;
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

// Rotulo do tipo em fala de gente. "Novo" na CMED = a marca original — mas
// "Referência" e jargao que ninguem leigo entende, entao vira "De marca".
export function tipoLabel(tipo: string | null): string | null {
  const t = (tipo ?? "").toLowerCase();
  if (!t) return null;
  if (t === "generico" || t === "genérico") return "Genérico";
  if (t === "similar") return "Similar";
  if (t === "novo") return "De marca";
  return tipo;
}

export function tipoClass(tipo: string | null): string {
  const t = (tipo ?? "").toLowerCase();
  if (t === "generico" || t === "genérico") return "tag-generico";
  if (t === "similar") return "tag-similar";
  if (t === "novo") return "tag-referencia";
  return "";
}

// Badge de tipo pro card: cor + sigla + rotulo em fala simples. Os tres eixos
// (generico/similar/de marca) com cores consistentes, resolvendo a duvida
// "e generico?" num olhar. Nunca escreve "Referencia".
export interface TipoInfo {
  label: string;
  sigla: string;
  cls: string;
}
export function tipoBadge(tipo: string | null): TipoInfo | null {
  const t = (tipo ?? "").toLowerCase();
  if (t === "generico" || t === "genérico") return { label: "Genérico", sigla: "G", cls: "tb-generico" };
  if (t === "similar") return { label: "Similar", sigla: "≈", cls: "tb-similar" };
  if (t === "novo") return { label: "De marca", sigla: "®", cls: "tb-marca" };
  return null;
}

// Quanto se economiza pagando `precoCents` num remedio cujo teto legal e
// `tetoCents`. Null quando nao ha economia (preco >= teto) ou teto invalido.
export function economiaVsTeto(precoCents: number, tetoCents: number): { reais: string; pct: number } | null {
  if (tetoCents <= 0 || precoCents >= tetoCents) return null;
  const eco = tetoCents - precoCents;
  return { reais: brl(eco)!, pct: Math.round((eco / tetoCents) * 100) };
}

// Termos tecnicos traduzidos pra uma frase simples (tooltip/rodape).
export const GLOSSARIO: Record<string, string> = {
  principioAtivo:
    "A substância que faz o remédio funcionar. É o que o genérico, o similar e o de marca têm em comum.",
  generico:
    "Mesmo princípio ativo do original, sem marca. Faz o mesmo efeito e costuma ser o mais barato. Aprovado pela ANVISA.",
  similar: "Mesma fórmula, com outra marca própria. Efeito equivalente ao original.",
  marca: "O original, o nome que você conhece na propaganda. Geralmente o mais caro.",
  teto:
    "O máximo que a farmácia pode cobrar por lei, definido pela ANVISA. Nenhuma pode passar disso — e quase sempre dá pra pagar bem menos.",
  farmaciaPopular:
    'Programa do governo. Alguns remédios saem de graça em farmácias com o selo "Aqui Tem Farmácia Popular".',
  controlado:
    "Tarja preta ou vermelha com retenção. Exige receita especial e o preço pode não estar disponível online.",
};

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
