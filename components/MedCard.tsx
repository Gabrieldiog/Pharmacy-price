import Link from "next/link";
import type { ClientMed, PrecosMeta } from "@/lib/types";
import type { NudgeGenerico } from "@/lib/meds-client";
import { semaforo } from "@/lib/semaforo";
import { brl, economiaVsTeto, formaLegivel, haQuantoTempo, isControlado, tetoPelaLei } from "@/lib/med-format";
import { TipoBadge } from "./TipoBadge";

// icone de fabrica: marca o laboratorio como "quem fabrica" (vs. a farmacia que vende)
function FabIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 20h20M4 20V9l5 3V9l5 3V5h6v15" />
    </svg>
  );
}

// outras = quantas outras opções (marcas/embalagens do mesmo remédio+dose) o card
// representa; nudge = o genérico mais barato equivalente, quando este é uma marca.
export function MedCard({
  med,
  meta,
  outras = 0,
  nudge = null,
}: {
  med: ClientMed;
  meta: PrecosMeta | null;
  outras?: number;
  nudge?: NudgeGenerico | null;
}) {
  // teto só é teto de verdade quando não é regime liberado. Um remédio "liberado"
  // pode ter PMC na tabela, mas ele não vincula — mostrar como teto engana.
  const teto = med.tetoGo != null && !med.semTeto ? brl(med.tetoGo) : null;
  // a substancia as vezes vem com varios ativos colados por ";" (base + sal) —
  // separa com " + " pra ler como gente
  const ativo = [med.substancia?.replace(/\s*;\s*/g, " + "), med.concentracao].filter(Boolean).join(" ");
  const apres = formaLegivel(med.apresentacao) ?? med.apresentacao;

  // tarja preta é controlado forte: não vende online, então qualquer preço casado
  // é espúrio (colisão de EAN). Suprime o preço e cai no aviso de controlado.
  const cheapest = isControlado(med.tarja) ? null : med.precos?.[0] ?? null; // precos ja vem ordenado asc
  const preco = cheapest ? brl(cheapest.centavos) : null;

  const sem = cheapest && med.tetoGo != null && !med.semTeto ? semaforo(cheapest.centavos, med.tetoGo) : null;
  const eco = cheapest && med.tetoGo != null && !med.semTeto ? economiaVsTeto(cheapest.centavos, med.tetoGo) : null;
  const lojas = cheapest && meta ? meta.redes?.find((r) => r.nome === cheapest.rede)?.lojasCount ?? 0 : 0;
  const frescor = meta ? haQuantoTempo(meta.observadoEm) : "";
  const semPrecoTeto = tetoPelaLei(med); // contexto do teto quando não há preço

  return (
    <div className="card-wrap">
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
          {apres && (
            <p className="card-sub">
              {apres}
              {outras > 0 && <span className="card-outras"> · +{outras} {outras === 1 ? "opção" : "opções"}</span>}
            </p>
          )}

          {/* fabricante: importa, mas nao decide — linha discreta */}
          {med.laboratorio && (
            <p className="card-lab">
              <FabIcon /> Fabricante: {med.laboratorio}
            </p>
          )}

          {med.tarja && /^Tarja (Vermelha|Preta)/i.test(med.tarja) && (
            <span className="tag tag-tarja">{med.tarja.replace(/^Tarja\s+/i, "")}</span>
          )}
        </div>

        {/* eixo 3 + 4: quanto e onde */}
        <div className="card-teto">
          {preco && cheapest ? (
            <>
              <span className="teto-label">{outras > 0 ? "a partir de" : "menor preço"}</span>
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
          ) : isControlado(med.tarja) ? (
            <>
              <span className="teto-label">controlado</span>
              <span className="teto-ceil">só no balcão, com receita</span>
            </>
          ) : (
            // sem preço de mercado coletado: diz isso na cara, e mostra o teto
            // pequeno e rotulado (é o máximo pela lei, não um preço a pagar)
            <>
              <span className="teto-label">ainda sem preço</span>
              {semPrecoTeto && <span className="teto-ceil">{semPrecoTeto}</span>}
            </>
          )}
        </div>
      </Link>

      {/* o coração da promessa: buscou a marca, mostra o genérico mais barato aqui */}
      {nudge && (
        <Link href={`/remedio?id=${encodeURIComponent(nudge.id)}`} className="card-nudge">
          <span className="card-nudge-txt">
            Tem genérico bem mais barato: <strong>{nudge.produto}</strong> a partir de{" "}
            <strong>{brl(nudge.centavos)}</strong>
          </span>
          <span className="card-nudge-seta" aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
