"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Panorama, Destaques } from "@/lib/types";
import { brl } from "@/lib/med-format";

const nf = (n: number) => n.toLocaleString("pt-BR");

export function PanoramaView() {
  const [p, setP] = useState<Panorama | null>(null);
  const [d, setD] = useState<Destaques | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/panorama.json").then((r) => r.json()),
      fetch("/destaques.json").then((r) => r.json()).catch(() => null),
    ])
      .then(([pan, dest]: [Panorama, Destaques | null]) => {
        if (!alive) return;
        setP(pan);
        setD(dest);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!p) return <p className="det-loading">Carregando…</p>;

  const eco = d?.economia?.[0] ?? null;
  const maiorPct = d?.economia?.reduce((mx, c) => Math.max(mx, c.economiaPct), 0) ?? null;

  return (
    <div className="pan">
      <div className="pan-stats">
        <div className="pan-stat">
          <span className="pan-num">{nf(p.comTeto)}</span>
          <span className="pan-cap">apresentações com teto legal</span>
        </div>
        <div className="pan-stat">
          <span className="pan-num">{nf(p.deGraca)}</span>
          <span className="pan-cap">de graça no Farmácia Popular</span>
        </div>
        <div className="pan-stat">
          <span className="pan-num">{nf(p.comPreco)}</span>
          <span className="pan-cap">com preço real coletado</span>
        </div>
        <div className="pan-stat">
          <span className="pan-num">
            {p.redesCount} <span className="pan-num-sub">redes</span>
          </span>
          <span className="pan-cap">
            {p.lojas} lojas em {p.cidade}
          </span>
        </div>
      </div>

      {p.economiaMediaPct != null && (
        <section className="pan-insight">
          <span className="pan-big">{p.economiaMediaPct}%</span>
          <div>
            <h2 className="pan-h2">é o quanto os preços das redes ficam abaixo do teto, em média.</h2>
            <p className="pan-txt">
              O teto é o máximo que a lei permite — na prática dá pra pagar bem menos. Por isso o que importa
              não é o teto, é comparar entre marcas e redes.
            </p>
          </div>
        </section>
      )}

      {eco && maiorPct != null && (
        <section className="pan-insight">
          <span className="pan-big">até {maiorPct}%</span>
          <div>
            <h2 className="pan-h2">é o que dá pra economizar trocando a marca pelo genérico.</h2>
            <p className="pan-txt">Mesma substância, mesma dose. Alguns exemplos reais:</p>
            <div className="pan-eco">
              {d!.economia.slice(0, 3).map((c) => (
                <Link key={c.id} href={`/remedio?id=${encodeURIComponent(c.id)}`} className="pan-eco-item">
                  <span className="pan-eco-nome">{[c.substancia?.replace(/;/g, " + "), c.concentracao].filter(Boolean).join(" · ")}</span>
                  <span className="pan-eco-preco">
                    {brl(c.baratoCents)} <s>{brl(c.caroCents)}</s>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="pan-insight">
        <span className="pan-big">{nf(p.deGraca)}</span>
        <div>
          <h2 className="pan-h2">remédios de graça no Farmácia Popular.</h2>
          <p className="pan-txt">Cobrindo principalmente as condições mais comuns:</p>
          <div className="pan-chips">
            {p.gratisTopIndicacoes.map((i) => (
              <span key={i.indicacao} className="pan-chip">
                {i.indicacao.toLowerCase()} <span className="pan-chip-n">{i.count}</span>
              </span>
            ))}
          </div>
          {p.gratisMaisCaro && (
            <p className="pan-txt pan-destaque">
              Tem remédio que, pelo teto, chegaria a <strong>{brl(p.gratisMaisCaro.cents)}</strong> —{" "}
              <Link href={`/remedio?id=${encodeURIComponent(p.gratisMaisCaro.id)}`} className="pan-link">
                {p.gratisMaisCaro.produto.toLowerCase()}
              </Link>{" "}
              — e sai de graça.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
