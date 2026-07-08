"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ClientMed } from "@/lib/types";
import { loadMedsIndex, equivalentes, menorPreco, type MedsIndex } from "@/lib/meds-client";
import { semaforo } from "@/lib/semaforo";
import { brl, ddmm, isControlado, tipoClass, tipoLabel } from "@/lib/med-format";
import { Denuncia } from "./Denuncia";

// tipo (generico/similar/referencia) + tarja. O fabricante vai separado, com rotulo.
function Tags({ med }: { med: ClientMed }) {
  return (
    <div className="card-tags">
      {med.tipo && <span className={`tag ${tipoClass(med.tipo)}`}>{tipoLabel(med.tipo)}</span>}
      {med.tarja && /^Tarja (Vermelha|Preta)/i.test(med.tarja) && (
        <span className="tag tag-tarja">{med.tarja.replace(/^Tarja\s+/i, "")}</span>
      )}
    </div>
  );
}

// preco de um equivalente na listagem (o mais barato, de graca, ou so o teto)
function precoResumo(m: ClientMed): { texto: string; cls: string } {
  const menor = menorPreco(m);
  if (menor != null) return { texto: brl(menor)!, cls: "eq-preco" };
  if (m.deGraca) return { texto: "de graça", cls: "eq-preco eq-gratis" };
  if (m.tetoGo != null) return { texto: `teto ${brl(m.tetoGo)}`, cls: "eq-preco eq-teto" };
  return { texto: "—", cls: "eq-preco eq-vazio" };
}

export function Remedio() {
  const params = useSearchParams();
  const id = params.get("id");
  const [idx, setIdx] = useState<MedsIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let alive = true;
    loadMedsIndex()
      .then((i) => {
        if (!alive) return;
        setIdx(i);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setErro(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const med = idx && id ? idx.byId.get(id) ?? null : null;
  const equivs = useMemo(() => (idx && med ? equivalentes(idx, med) : []), [idx, med]);

  if (loading) return <p className="det-loading">Carregando…</p>;

  if (erro) {
    return (
      <div className="det-vazio">
        <p>Não foi possível carregar a base agora. Verifique a conexão e recarregue a página.</p>
        <Link href="/" className="voltar">
          ← voltar para a busca
        </Link>
      </div>
    );
  }

  if (!med) {
    return (
      <div className="det-vazio">
        <p>Não encontramos esse remédio.</p>
        <Link href="/" className="voltar">
          ← voltar para a busca
        </Link>
      </div>
    );
  }

  const cheapest = med.precos?.[0] ?? null;
  const sem = cheapest && med.tetoGo != null && !med.semTeto ? semaforo(cheapest.centavos, med.tetoGo) : null;
  const lojas = cheapest && idx?.meta ? idx.meta.redes?.find((r) => r.nome === cheapest.rede)?.lojasCount ?? 0 : 0;
  const sub = [med.concentracao, med.apresentacao].filter(Boolean).join(" · ");
  const vistos = equivs.slice(0, 40);

  return (
    <div className="det">
      <Link href="/" className="voltar">
        ← voltar para a busca
      </Link>

      <header className="det-head">
        <h1 className="det-titulo">{med.produto}</h1>
        {sub && <p className="det-sub">{sub}</p>}
        <Tags med={med} />
        {med.laboratorio && (
          <p className="det-fab">
            Fabricante: <strong>{med.laboratorio}</strong>
          </p>
        )}
        {med.deGraca && (
          <div className="free">
            <span className="free-dot" />
            De graça no Farmácia Popular
            {med.indicacao && <span className="free-ind">· {med.indicacao.toLowerCase()}</span>}
          </div>
        )}
      </header>

      <section className="det-preco">
        {cheapest ? (
          <>
            <div className="det-preco-topo">
              <div>
                <span className="det-preco-label">menor preço praticado em {idx?.meta?.cidade ?? "Goiânia"}</span>
                <div className="det-preco-val">
                  {brl(cheapest.centavos)} <span className="det-preco-rede">na {cheapest.rede}</span>
                </div>
              </div>
              {sem && <span className={`semaforo sem-${sem.cls}`}>{sem.label}</span>}
            </div>
            {med.precos.length > 1 && <p className="det-redes-head">preço em cada rede de farmácia</p>}
            <ul className="det-redes">
              {med.precos.map((p) => (
                <li key={p.rede} className={p.rede === cheapest.rede ? "melhor" : ""}>
                  <span>{p.rede}</span>
                  <span className="cr-val">{brl(p.centavos)}</span>
                </li>
              ))}
            </ul>
            <div className="det-preco-pe">
              {med.tetoGo != null && !med.semTeto && <span>teto legal em GO {brl(med.tetoGo)}</span>}
              <span>
                {lojas > 0 ? `${lojas} ${lojas === 1 ? "loja" : "lojas"}` : "entrega"} ·{" "}
                {ddmm(idx?.meta?.observadoEm)}
              </span>
            </div>
          </>
        ) : isControlado(med.tarja) ? (
          <div className="det-controlado">
            <p>
              <strong>Medicamento controlado (tarja preta).</strong> Não é vendido pela internet — por isso não
              temos o preço praticado das redes pra comparar. O preço real fica no balcão da farmácia, com receita.
            </p>
            {med.tetoGo != null && !med.semTeto && (
              <p className="det-controlado-teto">
                Teto legal em Goiás: <strong>{brl(med.tetoGo)}</strong> — o máximo que a lei permite cobrar.
              </p>
            )}
          </div>
        ) : med.semTeto ? (
          <p className="det-preco-simples">Preço liberado — este medicamento não tem teto legal na CMED.</p>
        ) : med.tetoGo != null ? (
          <p className="det-preco-simples">
            Teto legal em Goiás: <strong>{brl(med.tetoGo)}</strong>. Ainda não temos preço praticado coletado.
          </p>
        ) : (
          <p className="det-preco-simples">Teto legal indisponível para esta apresentação.</p>
        )}
      </section>

      {sem?.cls === "vermelho" && cheapest && med.tetoGo != null && (
        <section className="det-denuncia">
          <Denuncia produto={med.produto} precoCents={cheapest.centavos} tetoCents={med.tetoGo} uf="GO" />
        </section>
      )}

      {med.grupo && (
        <section className="det-equiv">
          <h2 className="det-h2">Equivalentes na mesma dose</h2>
          <p className="det-equiv-lede">
            Mesmo princípio ativo e mesma concentração — genéricos, similares e a marca de referência. Do mais
            barato pro mais caro.
          </p>
          {equivs.length === 0 ? (
            <p className="det-equiv-vazio">Não encontramos outra apresentação equivalente na base.</p>
          ) : (
            <>
              <ul className="det-equiv-lista">
                {vistos.map((m) => {
                  const resumo = precoResumo(m);
                  const barato = menorPreco(m) != null && menorPreco(m) === menorPreco(vistos[0]!);
                  return (
                    <li key={m.id}>
                      <Link href={`/remedio?id=${encodeURIComponent(m.id)}`} className={`eq ${barato ? "eq-barato" : ""}`}>
                        <span className="eq-nome">
                          <span className="eq-titulo">
                            {m.produto}
                            {m.laboratorio && <span className="eq-lab"> · {m.laboratorio}</span>}
                          </span>
                          {m.apresentacao && <span className="eq-apr">{m.apresentacao}</span>}
                        </span>
                        <span className={resumo.cls}>{resumo.texto}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {equivs.length > vistos.length && (
                <p className="det-equiv-mais">+ {equivs.length - vistos.length} equivalentes</p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
