"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { loadMedsIndex, searchMeds, agrupaResultados, genericoMaisBarato, menorPreco, type MedsIndex } from "@/lib/meds-client";
import { MedCard } from "./MedCard";

export function Search({ fallback }: { fallback?: ReactNode }) {
  const [idx, setIdx] = useState<MedsIndex | null>(null);
  const [q, setQ] = useState("");
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
        setErro(true); // base não carregou — distinto de "nada encontrado"
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // agrupa por remédio (produto + dose/forma): junta as N marcas da mesma dipirona num
  // card só, em vez da parede de cards idênticos. Busca um pool maior (120) porque o
  // agrupamento encolhe a lista. porUtilidade: quem tem preço/de-graça sobe.
  const grupos = useMemo(() => (idx ? agrupaResultados(searchMeds(idx, q, 120, true)) : []), [q, idx]);
  const comPreco = useMemo(() => grupos.filter((g) => menorPreco(g.rep) != null).length, [grupos]);
  const show = q.trim().length >= 2;

  return (
    <div className="search">
      <div className="search-box">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={loading ? "Carregando a base de medicamentos…" : "Digite o remédio (ex.: dipirona, losartana, insulina…)"}
          disabled={loading}
          autoFocus
          aria-label="Buscar medicamento"
        />
      </div>

      {show ? (
        <div className="results">
          {erro ? (
            <div className="results-vazio" role="status">
              <p className="results-vazio-titulo">Não consegui carregar a base de remédios.</p>
              <p className="results-vazio-dica">Verifique a conexão e recarregue a página.</p>
            </div>
          ) : grupos.length > 0 ? (
            <>
              <div className="results-count" role="status">
                {grupos.length} {grupos.length === 1 ? "remédio" : "remédios"}
                {comPreco > 0 && comPreco < grupos.length && <span className="card-outras"> · {comPreco} com preço aqui</span>}
              </div>
              {grupos.map((g) => (
                <MedCard
                  key={g.rep.id}
                  med={g.rep}
                  meta={idx?.meta ?? null}
                  outras={g.total - 1}
                  nudge={idx ? genericoMaisBarato(idx, g.rep) : null}
                />
              ))}
            </>
          ) : (
            <VazioBusca q={q.trim()} />
          )}
        </div>
      ) : (
        // destaques aparecem na hora (2 KB proprios), sem esperar o indice de busca (8,5 MB)
        fallback
      )}
    </div>
  );
}

// estado vazio que ajuda: aponta pro nome do princípio ativo (não um mapa sintoma→remédio,
// que seria conselho médico). Também lembra de conferir a grafia.
function VazioBusca({ q }: { q: string }) {
  return (
    <div className="results-vazio" role="status">
      <p className="results-vazio-titulo">
        Nada encontrado para <strong>“{q}”</strong>.
      </p>
      <p className="results-vazio-dica">
        Tente o <strong>nome do princípio ativo</strong> (a substância) em vez da marca — por exemplo{" "}
        <em>dipirona</em> (Novalgina), <em>ibuprofeno</em> (Advil), <em>omeprazol</em> (Losec). Vale também conferir a
        grafia.
      </p>
    </div>
  );
}
