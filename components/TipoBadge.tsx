import { tipoBadge } from "@/lib/med-format";

// Genérico / Similar / De marca — cor + sigla + rótulo, sempre os três juntos
// (cor nunca sozinha, pela acessibilidade). Responde "é genérico?" num olhar.
export function TipoBadge({ tipo }: { tipo: string | null }) {
  const t = tipoBadge(tipo);
  if (!t) return null;
  return (
    <span className={`tbadge ${t.cls}`}>
      <span className="tbadge-sigla" aria-hidden="true">
        {t.sigla}
      </span>
      {t.label}
    </span>
  );
}
