"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ClientMed } from "@/lib/types";
import { loadMedsIndex, equivalentes, menorPreco, type MedsIndex } from "@/lib/meds-client";
import { semaforo } from "@/lib/semaforo";
import { brl, ddmm, economiaVsTeto, exigeReceitaRetida, formaLegivel, GLOSSARIO, isControlado } from "@/lib/med-format";
import { ondeComprar } from "@/lib/onde-comprar";
import { Denuncia } from "./Denuncia";
import { PrecoAoVivo } from "./PrecoAoVivo";
import { TipoBadge } from "./TipoBadge";
import { InfoTip } from "./InfoTip";

// tipo (generico/similar/referencia) + tarja. O fabricante vai separado, com rotulo.
function Tags({ med }: { med: ClientMed }) {
  return (
    <div className="card-tags">
      <TipoBadge tipo={med.tipo} />
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

export function Remedio({ id }: { id: string }) {
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

  // tarja preta (controlado forte) não vende online: suprime qualquer preço casado
  // (espúrio) e deixa o bloco de controlado assumir. A vermelha "sob restrição" é
  // vendida (com receita retida), então mantém o preço, só com um aviso.
  const cheapest = isControlado(med.tarja) ? null : med.precos?.[0] ?? null;
  const sem = cheapest && med.tetoGo != null && !med.semTeto ? semaforo(cheapest.centavos, med.tetoGo) : null;
  const redeMeta = cheapest && idx?.meta ? idx.meta.redes?.find((r) => r.nome === cheapest.rede) : undefined;
  const lojas = redeMeta?.lojasCount ?? 0;
  const cidade = idx?.meta?.cidade ?? "Goiânia";
  // onde comprar a rede mais barata: lojas com mapa quando temos, e SEMPRE um
  // link pra achar a rede na cidade (nunca some, como sumia pra São João/Drogal)
  const oc = cheapest ? ondeComprar(cheapest.rede, cidade, redeMeta?.lojas ?? []) : null;
  const eco = cheapest && med.tetoGo != null && !med.semTeto ? economiaVsTeto(cheapest.centavos, med.tetoGo) : null;
  const ativo = [med.substancia?.replace(/\s*;\s*/g, " + "), med.concentracao].filter(Boolean).join(" ");
  const ehGenerico = !!med.tipo && /gen[eé]rico|similar/i.test(med.tipo);
  const vistos = equivs.slice(0, 40);

  return (
    <div className="det">
      <Link href="/" className="voltar">
        ← voltar para a busca
      </Link>

      <header className="det-head">
        <h1 className="det-titulo">{med.produto}</h1>
        {ativo && (
          <p className="det-ativo">
            Princípio ativo: <strong>{ativo}</strong>
            <InfoTip>{GLOSSARIO.principioAtivo}</InfoTip>
          </p>
        )}
        {med.apresentacao && (
          <p className="det-sub">
            {formaLegivel(med.apresentacao) ?? med.apresentacao}
            {formaLegivel(med.apresentacao) && <span className="det-sub-cru"> · {med.apresentacao}</span>}
          </p>
        )}
        <Tags med={med} />
        {med.laboratorio && (
          <p className="det-fab">
            Fabricante: <strong>{med.laboratorio}</strong>
          </p>
        )}
        {med.deGraca && (
          <div className="det-popular">
            <div className="free">
              <span className="free-check" aria-hidden="true">✓</span>
              De graça pela Farmácia Popular
            </div>
            <p className="det-popular-req">
              Pra retirar de graça: receita na validade, documento com foto + CPF, e uma farmácia com o selo
              &ldquo;Aqui Tem Farmácia Popular&rdquo;.
              {med.indicacao && <> · trata {med.indicacao.toLowerCase()}</>}
            </p>
          </div>
        )}
      </header>

      {ehGenerico && (
        <section className="det-generico">
          <div className="det-generico-selos">
            <span>Mesmo princípio ativo do original</span>
            <span>Aprovado pela Anvisa</span>
            <span>Mesmo efeito</span>
          </div>
          <p className="det-generico-pq">
            Por que costuma ser mais barato?
            <InfoTip rotulo="Por que o genérico é mais barato?">
              O genérico não paga a pesquisa, os testes e o marketing que a marca já pagou. Vários laboratórios
              fazem o mesmo remédio, e a concorrência derruba o preço — sem perder qualidade. A Anvisa testa e
              garante que funciona igual.
            </InfoTip>
          </p>
        </section>
      )}

      <section className="det-preco">
        {exigeReceitaRetida(med.tarja) && (
          <p className="det-receita-retida">
            Exige receita — a farmácia retém a receita na hora da compra (tarja vermelha sob restrição).
          </p>
        )}
        {cheapest ? (
          <>
            <div className="det-preco-topo">
              <div>
                <span className="det-preco-label">menor preço praticado em {cidade}</span>
                <div className="det-preco-val">
                  {brl(cheapest.centavos)} <span className="det-preco-rede">na {cheapest.rede}</span>
                </div>
              </div>
              {sem && <span className={`semaforo sem-${sem.cls}`}>{sem.label}</span>}
            </div>
            <p className="det-preco-nota">
              Preço do site da {cheapest.rede} — o mesmo pra rede toda na internet. No balcão da loja pode variar.
              <InfoTip>{GLOSSARIO.precoRede}</InfoTip>
            </p>
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
              {med.tetoGo != null && !med.semTeto && (
                <span>
                  teto legal em GO {brl(med.tetoGo)}
                  {eco && <span className="det-eco"> · você economiza {eco.pct}%</span>}
                  <InfoTip>{GLOSSARIO.teto}</InfoTip>
                </span>
              )}
              <span>
                {lojas > 0 ? `${lojas} ${lojas === 1 ? "loja" : "lojas"}` : "entrega"} · coletado em{" "}
                {ddmm(idx?.meta?.observadoEm)}
              </span>
            </div>
            {oc && (
              <div className="det-lojas">
                <span className="det-lojas-head">
                  onde comprar · {oc.rede} em {oc.cidade}
                </span>
                {oc.temEndereco ? (
                  <>
                    <ul>
                      {oc.lojas.map((l, i) => (
                        <li key={i}>
                          <span className="det-loja-end">{l.rotulo}</span>
                          <a href={l.mapa} target="_blank" rel="noopener noreferrer" className="det-loja-mapa">
                            ver no mapa →
                          </a>
                        </li>
                      ))}
                    </ul>
                    <a href={oc.buscaRede} target="_blank" rel="noopener noreferrer" className="det-lojas-todas">
                      ver todas as lojas da {oc.rede} →
                    </a>
                  </>
                ) : (
                  <p className="det-lojas-vazio">
                    Esse é o preço do site da {oc.rede} (o mesmo pra rede toda). Pra comprar pessoalmente, ache uma
                    loja em {oc.cidade}:{" "}
                    <a href={oc.buscaRede} target="_blank" rel="noopener noreferrer" className="det-lojas-vazio-link">
                      ver lojas da {oc.rede} no mapa →
                    </a>
                  </p>
                )}
              </div>
            )}
          </>
        ) : isControlado(med.tarja) ? (
          <div className="det-controlado">
            <p>
              <strong>
                Medicamento controlado (tarja preta). <InfoTip>{GLOSSARIO.controlado}</InfoTip>
              </strong>{" "}
              Não é vendido pela internet — por isso não temos o preço praticado das redes pra comparar. O preço
              real fica no balcão da farmácia, com receita.
            </p>
            {med.tetoGo != null && !med.semTeto && (
              <p className="det-controlado-teto">
                Teto legal em Goiás: <strong>{brl(med.tetoGo)}</strong> — o máximo que a lei permite cobrar.
              </p>
            )}
          </div>
        ) : med.semTeto ? (
          <p className="det-preco-simples">
            Ainda não temos o preço coletado deste medicamento. Ele é de preço livre — a CMED não define um teto
            legal pra ele.
          </p>
        ) : med.tetoGo != null ? (
          <p className="det-preco-simples">
            Ainda não temos o preço coletado deste medicamento. O teto legal em Goiás — o máximo que a lei permite
            cobrar, não um preço à venda — é <strong>{brl(med.tetoGo)}</strong>.
          </p>
        ) : (
          <p className="det-preco-simples">Ainda não temos o preço coletado nem o teto legal desta apresentação.</p>
        )}
      </section>

      {/* controlado (tarja preta) não vende online: nada de preço ao vivo — a nota
          fiscal de um estado poderia até captar a venda de balcão, e mostrá-la aqui
          contradiria o aviso de "só no balcão, com receita" logo acima */}
      {!isControlado(med.tarja) && <PrecoAoVivo med={med} />}

      {sem?.cls === "vermelho" && cheapest && med.tetoGo != null && (
        <section className="det-denuncia">
          <Denuncia produto={med.produto} precoCents={cheapest.centavos} tetoCents={med.tetoGo} uf="GO" />
        </section>
      )}

      {med.grupo && (
        <section className="det-equiv">
          <h2 className="det-h2">Equivalentes na mesma dose</h2>
          <p className="det-equiv-lede">
            Mesmo princípio ativo, mesma dose e mesma apresentação — genéricos, similares e a marca de referência,
            do mais barato pro mais caro. Formas diferentes (injetável, comprimido de liberação prolongada) ficam
            de fora porque não se trocam.
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
                      <Link href={`/remedio/${encodeURIComponent(m.id)}`} className={`eq ${barato ? "eq-barato" : ""}`}>
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
