import type { ClientMed } from "@/lib/types";

function brl(cents: number | null): string | null {
  if (cents == null) return null;
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

// "Novo" na CMED = medicamento de referencia (marca original).
function tipoLabel(tipo: string | null): string | null {
  if (!tipo) return null;
  if (tipo.toLowerCase() === "novo") return "Referência";
  return tipo;
}

function tipoClass(tipo: string | null): string {
  const t = (tipo ?? "").toLowerCase();
  if (t === "generico" || t === "genérico") return "tag-generico";
  if (t === "similar") return "tag-similar";
  if (t === "novo") return "tag-referencia";
  return "";
}

export function MedCard({ med }: { med: ClientMed }) {
  const teto = brl(med.tetoGo);
  const sub = [med.concentracao, med.apresentacao].filter(Boolean).join(" · ");

  return (
    <article className="card">
      <div className="card-main">
        <h3 className="card-title">{med.produto}</h3>
        {sub && <p className="card-sub">{sub}</p>}
        <div className="card-tags">
          {med.laboratorio && <span className="tag">{med.laboratorio}</span>}
          {med.tipo && <span className={`tag ${tipoClass(med.tipo)}`}>{tipoLabel(med.tipo)}</span>}
          {med.tarja && /^Tarja (Vermelha|Preta)/i.test(med.tarja) && (
            <span className="tag tag-tarja">{med.tarja.replace(/^Tarja\s+/i, "")}</span>
          )}
        </div>
        {med.deGraca && (
          <div className="free">
            <span className="free-dot" />
            De graça no Farmácia Popular
            {med.indicacao && <span className="free-ind">· {med.indicacao.toLowerCase()}</span>}
          </div>
        )}
      </div>

      <div className="card-teto">
        {med.semTeto ? (
          <>
            <span className="teto-label">preço liberado</span>
            <span className="teto-na">sem teto legal</span>
          </>
        ) : teto ? (
          <>
            <span className="teto-label">Teto legal · GO</span>
            <span className="teto-val">{teto}</span>
          </>
        ) : (
          <span className="teto-na">teto indisponível</span>
        )}
      </div>
    </article>
  );
}
