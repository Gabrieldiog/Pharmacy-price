import Link from "next/link";
import type { ClientMed, PrecosMeta } from "@/lib/types";
import { semaforo } from "@/lib/semaforo";
import { brl, economiaVsTeto, haQuantoTempo, isControlado } from "@/lib/med-format";
import { TipoBadge } from "./TipoBadge";

// icone de fabrica: marca o laboratorio como "quem fabrica" (vs. a farmacia que vende)
function FabIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 20h20M4 20V9l5 3V9l5 3V5h6v15" />
    </svg>
  );
}

export function MedCard({ med, meta }: { med: ClientMed; meta: PrecosMeta | null }) {
  // teto só é teto de verdade quando não é regime liberado. Um remédio "liberado"
  // pode ter PMC na tabela, mas ele não vincula — mostrar como teto engana.
  const teto = med.tetoGo != null && !med.semTeto ? brl(med.tetoGo) : null;
  // a substancia as vezes vem com varios ativos colados por ";" (base + sal) —
  // separa com " + " pra ler como gente
  const ativo = [med.substancia?.replace(/\s*;\s*/g, " + "), med.concentracao].filter(Boolean).join(" ");

  const cheapest = med.precos?.[0] ?? null; // precos ja vem ordenado asc
  const preco = cheapest ? brl(cheapest.centavos) : null;

  const sem = cheapest && med.tetoGo != null && !med.semTeto ? semaforo(cheapest.centavos, med.tetoGo) : null;
  const eco = cheapest && med.tetoGo != null && !med.semTeto ? economiaVsTeto(cheapest.centavos, med.tetoGo) : null;
  const lojas = cheapest && meta ? meta.redes?.find((r) => r.nome === cheapest.rede)?.lojasCount ?? 0 : 0;
  const frescor = meta ? haQuantoTempo(meta.observadoEm) : "";

  return (
    <Link href={`/remedio?id=${encodeURIComponent(med.id)}`} className="card">
      <div className="card-main">
        {/* eixo 1: de graca — ganha de qualquer preco, entao vem no topo */}
        {med.deGraca && (
          <div className="free">
            <span className="free-check" aria-hidden="true">✓</span>
            De graça pela Farmácia Popular
          </div>
        )}

        {/* eixo 2: o que e — nome + tipo (generico/de marca) na mesma linha */}
        <div className="card-head">
          <h3 className="card-title">{med.produto}</h3>
          <TipoBadge tipo={med.tipo} />
        </div>

        {/* ancora: o principio ativo prova que os tipos sao o mesmo remedio */}
        {ativo && <p className="card-ativo">Princípio ativo: {ativo}</p>}
        {med.apresentacao && <p className="card-sub">{med.apresentacao}</p>}

        {/* fabricante: importa, mas nao decide — linha discreta */}
        {med.laboratorio && (
          <p className="card-lab">
            <FabIcon /> Fabricante: {med.laboratorio}
          </p>
        )}

        {med.tarja && /^Tarja (Vermelha|Preta)/i.test(med.tarja) && (
          <span className="tag tag-tarja">{med.tarja.replace(/^Tarja\s+/i, "")}</span>
        )}
        {isControlado(med.tarja) && med.precos.length === 0 && (
          <div className="controlado-nota">Controlado — vendido só no balcão, com receita</div>
        )}
      </div>

      {/* eixo 3 + 4: quanto e onde */}
      <div className="card-teto">
        {preco && cheapest ? (
          <>
            <span className="teto-label">menor preço</span>
            <span className="preco-val">{preco}</span>
            <span className="preco-rede">na {cheapest.rede}</span>
            {eco ? (
              <span className="eco-chip">
                −{eco.pct}% <span className="eco-sub">vs teto {teto}</span>
              </span>
            ) : sem?.cls === "vermelho" ? (
              <span className="semaforo sem-vermelho">acima do teto</span>
            ) : teto ? (
              <span className="teto-mini">teto {teto}</span>
            ) : null}
            {meta && (
              <span className="preco-meta">
                {lojas > 0 ? `${lojas} ${lojas === 1 ? "loja" : "lojas"} em ${meta.cidade}` : `entrega em ${meta.cidade}`}
                {frescor && ` · ${frescor}`}
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
