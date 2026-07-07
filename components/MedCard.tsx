import Link from "next/link";
import type { ClientMed, PrecosMeta } from "@/lib/types";
import { semaforo } from "@/lib/semaforo";
import { brl, ddmm, tipoClass, tipoLabel } from "@/lib/med-format";

export function MedCard({ med, meta }: { med: ClientMed; meta: PrecosMeta | null }) {
  const teto = brl(med.tetoGo);
  const sub = [med.concentracao, med.apresentacao].filter(Boolean).join(" · ");

  const cheapest = med.precos?.[0] ?? null; // precos ja vem ordenado asc
  const outras = med.precos?.slice(1) ?? [];
  const preco = cheapest ? brl(cheapest.centavos) : null;

  // semaforo: menor preco praticado vs teto legal
  const sem =
    cheapest && med.tetoGo != null && !med.semTeto ? semaforo(cheapest.centavos, med.tetoGo) : null;

  const lojas = cheapest && meta ? meta.redes?.find((r) => r.nome === cheapest.rede)?.lojasCount ?? 0 : 0;

  return (
    <Link href={`/remedio?id=${encodeURIComponent(med.id)}`} className="card">
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
        {preco && cheapest ? (
          <>
            <span className="teto-label">{outras.length ? "menor preço" : "preço praticado"}</span>
            <span className="preco-val">{preco}</span>
            <span className="preco-rede">na {cheapest.rede}</span>
            {sem && <span className={`semaforo sem-${sem.cls}`}>{sem.label}</span>}
            {teto && <span className="teto-mini">teto {teto}</span>}
            {outras.length > 0 && (
              <ul className="card-redes">
                {outras.map((p) => (
                  <li key={p.rede}>
                    <span className="cr-nome">{p.rede}</span>
                    <span className="cr-val">{brl(p.centavos)}</span>
                  </li>
                ))}
              </ul>
            )}
            {meta && (
              <span className="preco-meta">
                {lojas > 0 ? `${lojas} ${lojas === 1 ? "loja" : "lojas"} em ${meta.cidade}` : `entrega em ${meta.cidade}`}
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
    </Link>
  );
}
