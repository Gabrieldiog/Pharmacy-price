"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Destaques as DestaquesData } from "@/lib/types";
import { brl } from "@/lib/med-format";

export function Destaques() {
  const [d, setD] = useState<DestaquesData | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/destaques.json")
      .then((r) => r.json())
      .then((data: DestaquesData) => {
        if (alive) setD(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!d || (d.economia.length === 0 && d.gratis.length === 0)) return null;

  return (
    <div className="destaques">
      {d.economia.length > 0 && (
        <section>
          <h2 className="dest-h2">O mesmo remédio, muito mais barato</h2>
          <p className="dest-lede">Mesma substância e mesma dose — só muda a marca e o preço.</p>
          <div className="dest-grid">
            {d.economia.map((c) => (
              <Link key={c.id} href={`/remedio/${encodeURIComponent(c.id)}`} className="dest-eco">
                <span className="dest-eco-sub">
                  {[c.substancia?.replace(/;/g, " + "), c.concentracao].filter(Boolean).join(" · ")}
                </span>
                <div className="dest-eco-precos">
                  <span className="dest-eco-barato">{brl(c.baratoCents)}</span>
                  <span className="dest-eco-pct">-{c.economiaPct}%</span>
                </div>
                <span className="dest-eco-antes">
                  em vez de <s>{brl(c.caroCents)}</s>
                </span>
                <span className="dest-eco-nomes">
                  {c.baratoProduto} <span className="dest-eco-vs">no lugar de {c.caroProduto}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {d.gratis.length > 0 && (
        <section className="dest-gratis-sec">
          <h2 className="dest-h2">De graça no Farmácia Popular</h2>
          <p className="dest-lede">Esses o governo dá sem custo — é só a receita.</p>
          <div className="dest-gratis">
            {d.gratis.map((g) => (
              <Link key={g.id} href={`/remedio/${encodeURIComponent(g.id)}`} className="dest-free">
                <span className="dest-free-nome">{g.produto}</span>
                {g.indicacao && <span className="dest-free-ind">{g.indicacao.toLowerCase()}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
