import type { ClientMed, PrecosMeta } from "@/lib/types";

function brl(cents: number | null): string | null {
  if (cents == null) return null;
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

// "Novo" na CMED = medicamento de referencia (marca original).
function tipoLabel(tipo: string | null): string | null {
  if (!tipo) return null;
  return tipo.toLowerCase() === "novo" ? "Referência" : tipo;
}
function tipoClass(tipo: string | null): string {
  const t = (tipo ?? "").toLowerCase();
  if (t === "generico" || t === "genérico") return "tag-generico";
  if (t === "similar") return "tag-similar";
  if (t === "novo") return "tag-referencia";
  return "";
}
function ddmm(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MedCard({ med, meta }: { med: ClientMed; meta: PrecosMeta | null }) {
  const teto = brl(med.tetoGo);
  const preco = brl(med.precoRede);
  const sub = [med.concentracao, med.apresentacao].filter(Boolean).join(" · ");

  // semaforo: preco praticado vs teto legal
  let sem: { cls: string; label: string } | null = null;
  if (med.precoRede != null && med.tetoGo != null && !med.semTeto) {
    const pct = med.precoRede / med.tetoGo;
    const diff = Math.round((1 - pct) * 100);
    if (pct > 1) sem = { cls: "vermelho", label: `${Math.abs(diff)}% acima do teto` };
    else if (pct > 0.9) sem = { cls: "ambar", label: "quase no teto" };
    else sem = { cls: "verde", label: `${diff}% abaixo do teto` };
  }

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
        {preco ? (
          <>
            <span className="teto-label">{meta?.rede ?? "preço"} · retirada</span>
            <span className="preco-val">{preco}</span>
            {sem && <span className={`semaforo sem-${sem.cls}`}>{sem.label}</span>}
            {teto && <span className="teto-mini">teto {teto}</span>}
            {meta && (
              <span className="preco-meta">
                {meta.lojasCount} lojas em {meta.cidade}
                {ddmm(meta.observadoEm) && ` · ${ddmm(meta.observadoEm)}`}
              </span>
            )}
          </>
        ) : med.semTeto ? (
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
